/**
 * auth.test.js — Backend tests for FR-01, FR-02, FR-03, FR-04 (Authentication)
 * TC-01, TC-02, TC-03, TC-04 from the Traceability Matrix
 * Uses Jest + Supertest + mongodb-memory-server (no live MongoDB needed)
 */

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
let app;

// ── Lifecycle ──────────────────────────────────────────────────────────────
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Set env variable BEFORE requiring app so db.js picks it up
  process.env.MONGODB_URI = uri;

  // Disconnect any pre-existing connection, then re-connect via db.js
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Require db.js to establish connection, then require the app
  require("../db");
  await mongoose.connection.asPromise(); // wait until connected
  app = require("../server");
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Clear all collections between tests so each test is independent
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ── Helper ─────────────────────────────────────────────────────────────────
const validUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

async function signupUser(overrides = {}) {
  return request(app)
    .post("/api/signup")
    .send({ ...validUser, ...overrides });
}

// ── TC-01: Valid unique signup (FR-01) ─────────────────────────────────────
describe("TC-01: Valid unique signup — FR-01", () => {
  it("returns 201 Created and creates an account", async () => {
    const res = await signupUser();
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.name).toBe(validUser.name);
  });

  it("does NOT include password_hash in the response (NFR-04, SR-02)", async () => {
    const res = await signupUser();
    expect(res.status).toBe(201);
    expect(res.body.user).not.toHaveProperty("password_hash");
  });
});

// ── TC-02: Signup with 5-character password (FR-02, SR-03) ────────────────
describe("TC-02: Short password rejected — FR-02 / SR-03", () => {
  it("returns 400 Bad Request when password is shorter than 6 characters", async () => {
    const res = await signupUser({ password: "abc12" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("does not create an account when password is too short", async () => {
    await signupUser({ password: "abc12" });
    // Attempt login — should fail because no account was created
    const loginRes = await request(app)
      .post("/api/login")
      .send({ email: validUser.email, password: "abc12" });
    expect(loginRes.status).toBe(401);
  });
});

// ── Signup missing fields (FR-02) ─────────────────────────────────────────
describe("Missing fields on signup — FR-02", () => {
  it("returns 400 when name is missing", async () => {
    const res = await signupUser({ name: undefined });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await signupUser({ email: undefined });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await signupUser({ password: undefined });
    expect(res.status).toBe(400);
  });
});

// ── TC-03: Duplicate email returns 409 (FR-03, SR-01) ─────────────────────
describe("TC-03: Duplicate email — FR-03 / SR-01", () => {
  it("returns 409 Conflict on a duplicate email signup", async () => {
    await signupUser(); // First signup succeeds
    const res = await signupUser(); // Second with same email
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
  });
});

// ── TC-04: Login with correct/wrong password (FR-04, SR-04) ───────────────
describe("TC-04: Login — FR-04 / SR-04", () => {
  beforeEach(async () => {
    await signupUser(); // Create an account first
  });

  it("returns 200 with correct password", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(validUser.email);
  });

  it("returns 401 with wrong password", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: validUser.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});
