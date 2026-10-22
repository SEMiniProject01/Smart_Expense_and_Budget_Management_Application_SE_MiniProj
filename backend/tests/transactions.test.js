/**
 * transactions.test.js
 *
 * FR-05: Create Income/Expense Transaction
 * FR-06: List Transactions for Requesting User
 * FR-07: Delete a persisted transaction
 *
 * Tests cover creation validation, user-scoped listing, and deletion.
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
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("creates a valid expense transaction", async () => {
    const response = await createTransaction({
      type: "expense",
      name: "Lunch",
      category: "Food",
      amount: 450,
    });

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

// -----------------------------------------------------------------------------
// FR-05: Required field validation
// -----------------------------------------------------------------------------

describe("FR-05: Required field validation", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("rejects missing user_id", async () => {
    const response = await createTransaction({ user_id: undefined });
    expect(response.status).toBe(400);
  });

  test("rejects missing type", async () => {
    const response = await createTransaction({ type: undefined });
    expect(response.status).toBe(400);
  });

  test("rejects missing name", async () => {
    const response = await createTransaction({ name: undefined });
    expect(response.status).toBe(400);
  });

  test("rejects missing category", async () => {
    const response = await createTransaction({ category: undefined });
    expect(response.status).toBe(400);
  });

  test("rejects missing amount", async () => {
    const response = await createTransaction({ amount: undefined });
    expect(response.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// FR-05: Type validation
// -----------------------------------------------------------------------------

describe("FR-05: Transaction type validation", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("rejects invalid transaction type", async () => {
    const response = await createTransaction({ type: "transfer" });
    expect(response.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// FR-05: Amount validation
// -----------------------------------------------------------------------------

describe("FR-05: Amount validation", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("rejects non-numeric amount", async () => {
    const response = await createTransaction({ amount: "abc" });
    expect(response.status).toBe(400);
  });

  test("rejects zero amount", async () => {
    const response = await createTransaction({ amount: 0 });
    expect(response.status).toBe(400);
  });

  test("rejects negative amount", async () => {
    const response = await createTransaction({ amount: -100 });
    expect(response.status).toBe(400);
  });
});

// -----------------------------------------------------------------------------
// FR-06: List transactions for requesting user
// -----------------------------------------------------------------------------

describe("FR-06: List transactions", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("lists transactions belonging to the requesting user", async () => {
    await createTransaction({
      user_id: "test-user-001",
      name: "Lunch",
      category: "Food",
      amount: 450,
    });

    await createTransaction({
      user_id: "test-user-001",
      name: "Bus Ticket",
      category: "Transport",
      amount: 50,
    });

    const response = await request(app).get(
      "/api/transactions/test-user-001"
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("transactions");
    expect(Array.isArray(response.body.transactions)).toBe(true);
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
    expect(response.body).toHaveProperty("transactions");
    expect(response.body.transactions).toEqual([]);
  });

  test("does not return transactions belonging to another user", async () => {
    await createTransaction({
      user_id: "test-user-001",
      name: "My Lunch",
      category: "Food",
      amount: 450,
    });

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
    expect(response.body.transactions[0].name).toBe("My Lunch");
  });

  test("returns transactions sorted by newest first", async () => {
    await createTransaction({
      user_id: "test-user-001",
      name: "First Transaction",
      category: "Food",
      amount: 100,
    });

    await createTransaction({
      user_id: "test-user-001",
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

// -----------------------------------------------------------------------------
// FR-07: Delete persisted transactions
// -----------------------------------------------------------------------------

describe("FR-07: Delete transaction", () => {
  afterEach(async () => {
    await mongoose.connection.collection("transactions").deleteMany({});
  });

  test("deletes a transaction belonging to the requesting user", async () => {
    const created = await createTransaction({
      user_id: "test-user-001",
      name: "Lunch",
      amount: 450,
    });

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
    const created = await createTransaction({
      user_id: "test-user-001",
      name: "My Lunch",
    });

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

  test("returns 404 for a valid but nonexistent transaction ID", async () => {
    const nonexistentId = new mongoose.Types.ObjectId().toString();

    const response = await request(app).delete(
      `/api/transactions/test-user-001/${nonexistentId}`
    );

    expect(response.status).toBe(404);
  });

  test("returns 400 for an invalid transaction ID", async () => {
    const response = await request(app).delete(
      "/api/transactions/test-user-001/not-a-valid-id"
    );

    expect(response.status).toBe(400);
  });
});


