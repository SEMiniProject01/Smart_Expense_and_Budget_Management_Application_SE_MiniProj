
const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../server");
const User = require("../models/User");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("NFR-03: Password Security", () => {
  const userDetails = {
    name: "Test User",
    email: "test@example.com",
    password: "SecurePass123",
  };

  test("signup stores a bcrypt hash instead of the original password", async () => {
    const response = await request(app)
      .post("/api/signup")
      .send(userDetails);

    expect(response.status).toBe(201);

    const user = await User.findOne({ email: userDetails.email });

    expect(user).not.toBeNull();
    expect(user.password_hash).not.toBe(userDetails.password);
    expect(user.password_hash).toMatch(/^\$2[aby]\$/);

    const matches = await bcrypt.compare(
      userDetails.password,
      user.password_hash
    );

    expect(matches).toBe(true);
  });

  test("signup response does not expose the password hash", async () => {
    const response = await request(app)
      .post("/api/signup")
      .send(userDetails);

    expect(response.status).toBe(201);
    expect(response.body.user.password_hash).toBeUndefined();
  });

  test("login accepts the correct password", async () => {
    await request(app)
      .post("/api/signup")
      .send(userDetails);

    const response = await request(app)
      .post("/api/login")
      .send({
        email: userDetails.email,
        password: userDetails.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.password_hash).toBeUndefined();
  });

  test("login rejects an incorrect password", async () => {
    await request(app)
      .post("/api/signup")
      .send(userDetails);

    const response = await request(app)
      .post("/api/login")
      .send({
        email: userDetails.email,
        password: "WrongPassword123",
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  test("signup rejects duplicate email addresses", async () => {
    await request(app)
      .post("/api/signup")
      .send(userDetails);

    const response = await request(app)
      .post("/api/signup")
      .send(userDetails);

    expect(response.status).toBe(409);
    expect(response.body.error).toBeDefined();
  });
});
