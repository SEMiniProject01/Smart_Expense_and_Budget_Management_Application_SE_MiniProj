/**
 * transactions.test.js
 *
 * FR-05: Create Income/Expense Transaction
 *
 * Tests:
 * - Create valid expense
 * - Create valid income
 * - Required field validation
 * - Transaction type validation
 * - Amount validation
 */

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();

  process.env.MONGODB_URI = mongod.getUri();

  await mongoose.connect(process.env.MONGODB_URI);

  app = require("../server");
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------

async function createTransaction(overrides = {}) {
  return request(app)
    .post("/api/transactions")
    .send({
      user_id: "test-user-001",
      type: "expense",
      name: "Lunch",
      category: "Food",
      amount: 450,
      ...overrides,
    });
}

// -----------------------------------------------------------------------------
// FR-05: Valid transactions
// -----------------------------------------------------------------------------

describe("FR-05: Create transaction", () => {
  afterEach(async () => {
    await mongoose.connection
      .collection("transactions")
      .deleteMany({});
  });

  test("creates a valid expense transaction", async () => {
    const response = await createTransaction({
      type: "expense",
      name: "Lunch",
      category: "Food",
      amount: 450,
    });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty(
      "transaction"
    );

    expect(response.body.transaction.user_id).toBe(
      "test-user-001"
    );

    expect(response.body.transaction.type).toBe(
      "expense"
    );

    expect(response.body.transaction.name).toBe(
      "Lunch"
    );

    expect(response.body.transaction.category).toBe(
      "Food"
    );

    expect(response.body.transaction.amount).toBe(
      450
    );
  });

  test("creates a valid income transaction", async () => {
    const response = await createTransaction({
      type: "income",
      name: "Monthly Salary",
      category: "Salary",
      amount: 55000,
    });

    expect(response.status).toBe(201);

    expect(response.body.transaction.type).toBe(
      "income"
    );

    expect(response.body.transaction.name).toBe(
      "Monthly Salary"
    );

    expect(response.body.transaction.category).toBe(
      "Salary"
    );

    expect(response.body.transaction.amount).toBe(
      55000
    );
  });
});

// -----------------------------------------------------------------------------
// FR-05: Required field validation
// -----------------------------------------------------------------------------

describe("FR-05: Required field validation", () => {
  afterEach(async () => {
    await mongoose.connection
      .collection("transactions")
      .deleteMany({});
  });

  test("rejects missing user_id", async () => {
    const response = await createTransaction({
      user_id: undefined,
    });

    expect(response.status).toBe(400);
  });

  test("rejects missing type", async () => {
    const response = await createTransaction({
      type: undefined,
    });

    expect(response.status).toBe(400);
  });

  test("rejects missing name", async () => {
    const response = await createTransaction({
      name: undefined,
    });

    expect(response.status).toBe(400);
  });

  test("rejects missing category", async () => {
    const response = await createTransaction({
      category: undefined,
    });

    expect(response.status).toBe(400);
  });

  test("rejects missing amount", async () => {
    const response = await createTransaction({
      amount: undefined,
    });

    expect(response.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// FR-05: Type validation
// -----------------------------------------------------------------------------

describe("FR-05: Transaction type validation", () => {
  afterEach(async () => {
    await mongoose.connection
      .collection("transactions")
      .deleteMany({});
  });

  test("rejects invalid transaction type", async () => {
    const response = await createTransaction({
      type: "transfer",
    });

    expect(response.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// FR-05: Amount validation
// -----------------------------------------------------------------------------

describe("FR-05: Amount validation", () => {
  afterEach(async () => {
    await mongoose.connection
      .collection("transactions")
      .deleteMany({});
  });

  test("rejects non-numeric amount", async () => {
    const response = await createTransaction({
      amount: "abc",
    });

    expect(response.status).toBe(400);
  });

  test("rejects zero amount", async () => {
    const response = await createTransaction({
      amount: 0,
    });

    expect(response.status).toBe(400);
  });

  test("rejects negative amount", async () => {
    const response = await createTransaction({
      amount: -100,
    });

    expect(response.status).toBe(400);
  });
});