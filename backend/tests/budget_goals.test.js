/**
 * budget_goals.test.js — Backend tests for FR-08, FR-12 (Budget & Goals)
 * TC-08, TC-12 from the Traceability Matrix
 * Also covers SR-06 (budget validation), SR-07/SR-08 (goal validation)
 */

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
let app;
let userId;

// ── Lifecycle ──────────────────────────────────────────────────────────────
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  require("../db");
  await mongoose.connection.asPromise();
  app = require("../server");

  // Create a test user
  const res = await request(app).post("/api/signup").send({
    name: "Budget Tester",
    email: "budgettester@example.com",
    password: "password123",
  });
  userId = res.body.user.id;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.collections["goals"]?.deleteMany({});
});

// ── TC-08: Budget settings (FR-08, SR-06) ─────────────────────────────────
describe("TC-08: Budget settings — FR-08 / SR-06", () => {
  it("accepts zero as a valid monthly income and budget (boundary)", async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/settings`)
      .send({ monthly_income: 0, monthly_budget: 0 });
    expect(res.status).toBe(200);
    expect(res.body.user.monthly_income).toBe(0);
    expect(res.body.user.monthly_budget).toBe(0);
  });

  it("accepts positive values for income and budget", async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/settings`)
      .send({ monthly_income: 50000, monthly_budget: 20000 });
    expect(res.status).toBe(200);
    expect(res.body.user.monthly_income).toBe(50000);
    expect(res.body.user.monthly_budget).toBe(20000);
  });

  it("returns 400 when income is negative (SR-06)", async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/settings`)
      .send({ monthly_income: -1000, monthly_budget: 5000 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when budget is negative (SR-06)", async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/settings`)
      .send({ monthly_income: 50000, monthly_budget: -500 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when income is non-numeric (NFR-02)", async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/settings`)
      .send({ monthly_income: "abc", monthly_budget: 5000 });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a malformed user ID (SR-08)", async () => {
    const res = await request(app)
      .put("/api/users/not-a-valid-id/settings")
      .send({ monthly_income: 1000, monthly_budget: 500 });
    expect(res.status).toBe(404);
  });
});

// ── TC-12: Savings goals (FR-12, SR-07) ───────────────────────────────────
describe("TC-12: Savings goals — FR-12 / SR-07", () => {
  async function createGoal(overrides = {}) {
    return request(app)
      .post("/api/goals")
      .send({
        user_id: userId,
        name: "Emergency Fund",
        target: 10000,
        ...overrides,
      });
  }

  it("creates a goal with a positive target", async () => {
    const res = await createGoal({ target: 10000 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("goal");
    expect(res.body.goal.target).toBe(10000);
    expect(res.body.goal.name).toBe("Emergency Fund");
  });

  it("returns 400 when target is zero (SR-07)", async () => {
    const res = await createGoal({ target: 0 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("does not create goal when target is zero", async () => {
    await createGoal({ target: 0 });
    const listRes = await request(app).get(`/api/goals/${userId}`);
    expect(listRes.body.goals).toHaveLength(0);
  });

  it("returns 400 when target is negative (SR-07)", async () => {
    const res = await createGoal({ target: -500 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("lists goals for a user (FR-12)", async () => {
    await createGoal({ name: "Vacation", target: 30000 });
    const res = await request(app).get(`/api/goals/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("goals");
    expect(res.body.goals.length).toBeGreaterThanOrEqual(1);
    const names = res.body.goals.map((g) => g.name);
    expect(names).toContain("Vacation");
  });

  it("deletes a valid goal successfully (FR-12)", async () => {
    const createRes = await createGoal({ name: "Phone Fund", target: 15000 });
    const goalId = createRes.body.goal.id;

    const deleteRes = await request(app).delete(`/api/goals/${goalId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const listRes = await request(app).get(`/api/goals/${userId}`);
    const ids = listRes.body.goals.map((g) => g.id);
    expect(ids).not.toContain(goalId);
  });

  it("returns 404 when deleting a goal with a malformed ObjectId (SR-08)", async () => {
    const res = await request(app).delete("/api/goals/not-a-valid-id");
    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting a non-existent goal", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/goals/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it("returns 400 when goal name is missing", async () => {
    const res = await createGoal({ name: undefined });
    expect(res.status).toBe(400);
  });

  it("returns 400 when user_id is missing", async () => {
    const res = await request(app)
      .post("/api/goals")
      .send({ name: "Test Goal", target: 5000 });
    expect(res.status).toBe(400);
  });
});

// ── TC-16: API error status codes (NFR-05) ────────────────────────────────
describe("TC-16: API error codes — NFR-05", () => {
  it("returns JSON error body on 400 (bad request)", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send({ name: "No user_id", category: "Food", amount: 100 });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
    expect(typeof res.body.error).toBe("string");
  });

  it("returns JSON error body on 401 (unauthorized)", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: "nobody@test.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
  });

  it("returns JSON error body on 404 (not found / bad id)", async () => {
    const res = await request(app).delete("/api/transactions/bad-id");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("error");
  });
});
