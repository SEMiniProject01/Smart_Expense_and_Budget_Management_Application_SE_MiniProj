
/**
 * transactions.test.js
 *
 * FR-05: Create Income/Expense Transaction
 * FR-06: List Transactions for Requesting User
 * FR-07: Delete a persisted transaction
 * NFR-05: API Error Handling
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

// Helper
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

// FR-05: Create transaction
describe("FR-05: Create transaction", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("creates a valid expense transaction", async () => {
    const response = await createTransaction();

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("transaction");
    expect(response.body.transaction.user_id).toBe("test-user-001");
    expect(response.body.transaction.type).toBe("expense");
    expect(response.body.transaction.name).toBe("Lunch");
    expect(response.body.transaction.category).toBe("Food");
    expect(response.body.transaction.amount).toBe(450);
  });

  test("creates a valid income transaction", async () => {
    const response = await createTransaction({
      type: "income",
      name: "Monthly Salary",
      category: "Salary",
      amount: 55000,
    });

    expect(response.status).toBe(201);
    expect(response.body.transaction.type).toBe("income");
    expect(response.body.transaction.name).toBe("Monthly Salary");
    expect(response.body.transaction.category).toBe("Salary");
    expect(response.body.transaction.amount).toBe(55000);
  });
});

// FR-05: Required field validation
describe("FR-05: Required field validation", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test.each([
    ["user_id", { user_id: undefined }],
    ["type", { type: undefined }],
    ["name", { name: undefined }],
    ["category", { category: undefined }],
    ["amount", { amount: undefined }],
  ])("rejects missing %s", async (_field, overrides) => {
    const response = await createTransaction(overrides);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });
});

// FR-05: Transaction type validation
describe("FR-05: Transaction type validation", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("rejects invalid transaction type", async () => {
    const response = await createTransaction({ type: "transfer" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });
});

// FR-05: Amount validation
describe("FR-05: Amount validation", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test.each([
    ["non-numeric", "abc"],
    ["zero", 0],
    ["negative", -100],
  ])("rejects %s amount", async (_description, amount) => {
    const response = await createTransaction({ amount });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });
});

// FR-06: List transactions
describe("FR-06: List transactions", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("lists transactions belonging to the requesting user", async () => {
    await createTransaction({ name: "Lunch", amount: 450 });
    await createTransaction({
      name: "Bus Ticket",
      category: "Transport",
      amount: 50,
    });

    const response = await request(app).get(
      "/api/transactions/test-user-001"
    );

    expect(response.status).toBe(200);
    expect(response.body.transactions).toHaveLength(2);
    expect(
      response.body.transactions.every(
        (transaction) => transaction.user_id === "test-user-001"
      )
    ).toBe(true);
  });

  test("returns an empty list when the user has no transactions", async () => {
    const response = await request(app).get(
      "/api/transactions/user-with-no-transactions"
    );

    expect(response.status).toBe(200);
    expect(response.body.transactions).toEqual([]);
  });

  test("does not return another user's transactions", async () => {
    await createTransaction({ name: "My Lunch" });
    await createTransaction({
      user_id: "other-user-002",
      name: "Other User Expense",
      category: "Shopping",
      amount: 1000,
    });

    const response = await request(app).get(
      "/api/transactions/test-user-001"
    );

    expect(response.status).toBe(200);
    expect(response.body.transactions).toHaveLength(1);
    expect(response.body.transactions[0].user_id).toBe("test-user-001");
  });

  test("returns transactions sorted by newest first", async () => {
    await createTransaction({ name: "First Transaction", amount: 100 });
    await createTransaction({
      name: "Second Transaction",
      category: "Shopping",
      amount: 200,
    });

    const response = await request(app).get(
      "/api/transactions/test-user-001"
    );

    expect(response.status).toBe(200);
    expect(response.body.transactions).toHaveLength(2);
    expect(response.body.transactions[0].name).toBe("Second Transaction");
    expect(response.body.transactions[1].name).toBe("First Transaction");
  });
});

// FR-07: Delete transaction
describe("FR-07: Delete transaction", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("deletes a transaction belonging to the requesting user", async () => {
    const created = await createTransaction();

    expect(created.status).toBe(201);

    const transactionId = created.body.transaction.id;

    const response = await request(app).delete(
      `/api/transactions/test-user-001/${transactionId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Transaction deleted successfully.");

    const remaining = await mongoose.connection
      .collection("transactions")
      .findOne({ _id: new mongoose.Types.ObjectId(transactionId) });

    expect(remaining).toBeNull();
  });

  test("does not delete another user's transaction", async () => {
    const created = await createTransaction();
    const transactionId = created.body.transaction.id;

    const response = await request(app).delete(
      `/api/transactions/other-user-002/${transactionId}`
    );

    expect(response.status).toBe(404);

    const remaining = await mongoose.connection
      .collection("transactions")
      .findOne({ _id: new mongoose.Types.ObjectId(transactionId) });

    expect(remaining).not.toBeNull();
  });

  test("returns 404 for a nonexistent transaction ID", async () => {
    const nonexistentId = new mongoose.Types.ObjectId().toString();

    const response = await request(app).delete(
      `/api/transactions/test-user-001/${nonexistentId}`
    );

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });

  test("returns 400 for an invalid transaction ID", async () => {
    const response = await request(app).delete(
      "/api/transactions/test-user-001/not-a-valid-id"
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });
});

// NFR-05: API Error Handling
describe("NFR-05: API error responses", () => {
  test("returns JSON error for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .set("Content-Type", "application/json")
      .send('{"user_id":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Invalid JSON request body.",
    });
  });

  test("returns JSON error for unknown API endpoint", async () => {
    const response = await request(app).get("/api/unknown-endpoint");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });
});


