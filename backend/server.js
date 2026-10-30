// server.js — SmartBudget API.
// Preserves authentication, user settings, savings goals, transaction CRUD,
// and CSV parsing while keeping the existing API response shapes.

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Goal = require("./models/Goal");
const Transaction = require("./models/Transaction");

const app = express();
app.use(express.json({ limit: "2mb" }));

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === String(id);
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return NaN;
  return Number(value);
}

function categorizeNarration(narration, type = "expense") {
  const text = String(narration || "").toLowerCase();

  // Keep the existing transaction category supplied by the caller for normal
  // transaction creation; this helper is used for narration-based CSV preview.
  if (type === "income") return "Income";

  const rules = [
    ["Food", [
      "food", "lunch", "dinner", "breakfast", "snack", "swiggy", "zomato",
      "restaurant", "grocery", "groceries", "supermarket", "bakery", "cafe",
      "coffee", "dominos", "pizza", "mcdonald", "kfc"
    ]],
    ["Transport", [
      "transport", "uber", "ola", "rapido", "metro", "bus", "petrol", "fuel",
      "diesel", "parking", "toll", "railway", "train", "flight", "cab"
    ]],
    ["Shopping", [
      "shopping", "amazon", "flipkart", "myntra", "retail", "purchase",
      "clothing", "clothes", "electronics"
    ]],
    ["Entertainment", [
      "entertainment", "pvr", "inox", "cinema", "movie", "netflix", "spotify",
      "concert", "gaming", "bookmyshow"
    ]]
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return "Other";
}

// Small CSV parser that supports commas and escaped quotes inside quoted fields.
function parseCSVLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else {
      field += char;
    }
  }

  fields.push(field.trim());
  return fields;
}

function parseAmount(value) {
  const cleaned = String(value ?? "").replace(/[,₹$\s]/g, "").trim();
  if (!cleaned) return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : NaN;
}

// -----------------------------------------------------------------------------
// FR-01 / FR-02 / FR-03: Sign up
// -----------------------------------------------------------------------------

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password
    ) {
      return sendError(res, 400, "Name, email, and password are required.");
    }

    if (password.length < 6) {
      return sendError(res, 400, "Password must be at least 6 characters long.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return sendError(res, 409, "An account with this email already exists.");
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
    });

    return res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    if (error && error.code === 11000) {
      return sendError(res, 409, "An account with this email already exists.");
    }
    console.error("Signup error:", error);
    return sendError(res, 500, "Could not create account.");
  }
});

// -----------------------------------------------------------------------------
// FR-04: Log in
// -----------------------------------------------------------------------------

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password) {
      return sendError(res, 401, "Invalid email or password.");
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return sendError(res, 401, "Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return sendError(res, 401, "Invalid email or password.");
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, 500, "Could not log in.");
  }
});

// -----------------------------------------------------------------------------
// FR-08: User monthly income and budget settings
// -----------------------------------------------------------------------------

app.put("/api/users/:userId/settings", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return sendError(res, 404, "User not found.");
    }

    const { monthly_income, monthly_budget } = req.body || {};
    const income = toFiniteNumber(monthly_income);
    const budget = toFiniteNumber(monthly_budget);

    if (!Number.isFinite(income) || !Number.isFinite(budget)) {
      return sendError(res, 400, "Monthly income and budget must be numeric.");
    }
    if (income < 0 || budget < 0) {
      return sendError(res, 400, "Monthly income and budget cannot be negative.");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { monthly_income: income, monthly_budget: budget } },
      { new: true, runValidators: true }
    );

    if (!user) return sendError(res, 404, "User not found.");
    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    console.error("Update settings error:", error);
    return sendError(res, 500, "Could not update user settings.");
  }
});

// -----------------------------------------------------------------------------
// FR-12: Savings goals
// -----------------------------------------------------------------------------

app.post("/api/goals", async (req, res) => {
  try {
    const { user_id, name, target, deadline } = req.body || {};
    const targetAmount = toFiniteNumber(target);

    if (typeof user_id !== "string" || !user_id.trim() ||
        typeof name !== "string" || !name.trim() ||
        target === undefined || target === null || target === "") {
      return sendError(res, 400, "user_id, name, and target are required.");
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return sendError(res, 400, "Goal target must be a positive number.");
    }

    const goal = await Goal.create({
      user_id: user_id.trim(),
      name: name.trim(),
      target: targetAmount,
      ...(deadline !== undefined ? { deadline } : {}),
    });

    return res.status(201).json({ goal: goal.toJSON() });
  } catch (error) {
    console.error("Create goal error:", error);
    return sendError(res, 500, "Could not create savings goal.");
  }
});

app.get("/api/goals/:userId", async (req, res) => {
  try {
    const goals = await Goal.find({ user_id: req.params.userId }).sort({ created_at: -1 });
    return res.status(200).json({ goals: goals.map((goal) => goal.toJSON()) });
  } catch (error) {
    console.error("List goals error:", error);
    return sendError(res, 500, "Could not retrieve savings goals.");
  }
});

app.delete("/api/goals/:goalId", async (req, res) => {
  try {
    const { goalId } = req.params;
    if (!isValidObjectId(goalId)) {
      return sendError(res, 404, "Savings goal not found.");
    }

    const goal = await Goal.findByIdAndDelete(goalId);
    if (!goal) return sendError(res, 404, "Savings goal not found.");

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete goal error:", error);
    return sendError(res, 500, "Could not delete savings goal.");
  }
});

// -----------------------------------------------------------------------------
// FR-09: Parse bank-statement CSV for preview (does not persist rows)
// -----------------------------------------------------------------------------

app.post("/api/transactions/import/parse", async (req, res) => {
  try {
    const { csv } = req.body || {};
    if (typeof csv !== "string" || !csv.trim()) {
      return sendError(res, 400, "CSV content is required.");
    }

    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      return sendError(res, 400, "CSV must include a header and at least one data row.");
    }

    const headers = parseCSVLine(lines[0]).map((header) => header.toLowerCase().trim());
    const dateIndex = headers.findIndex((h) => ["date", "transaction date", "txn_date"].includes(h));
    const narrationIndex = headers.findIndex((h) => ["narration", "description", "details", "particulars", "name"].includes(h));
    const debitIndex = headers.findIndex((h) => ["debit", "withdrawal", "withdrawals", "debit amount"].includes(h));
    const creditIndex = headers.findIndex((h) => ["credit", "deposit", "deposits", "credit amount"].includes(h));

    if (dateIndex < 0 || narrationIndex < 0 || (debitIndex < 0 && creditIndex < 0)) {
      return sendError(res, 400, "CSV must contain Date, Narration, and Debit and/or Credit columns.");
    }

    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const fields = parseCSVLine(lines[i]);
      if (fields.every((field) => !field)) continue;

      const debit = debitIndex >= 0 ? parseAmount(fields[debitIndex] || "") : 0;
      const credit = creditIndex >= 0 ? parseAmount(fields[creditIndex] || "") : 0;

      if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
        return sendError(res, 400, `Invalid debit or credit amount on CSV row ${i + 1}.`);
      }
      if (debit > 0 && credit > 0) {
        return sendError(res, 400, `CSV row ${i + 1} cannot have both debit and credit amounts.`);
      }

      const narration = fields[narrationIndex] || "";
      const type = credit > 0 ? "income" : "expense";
      rows.push({
        date: fields[dateIndex] || "",
        narration,
        debit,
        credit,
        type,
        category: categorizeNarration(narration, type),
      });
    }

    return res.status(200).json({ transactions: rows, rows });
  } catch (error) {
    console.error("CSV parse error:", error);
    return sendError(res, 500, "Could not parse CSV.");
  }
});

// -----------------------------------------------------------------------------
// FR-05: Create transaction
// -----------------------------------------------------------------------------

app.post("/api/transactions", async (req, res) => {
  try {
    const { user_id, type, name, category, amount, date, txn_date, payment_method, notes } = req.body || {};

    // Keep original FR-05 required-field behavior: category is still required.
    if (
      typeof user_id !== "string" || !user_id.trim() ||
      typeof type !== "string" || !type ||
      typeof name !== "string" || !name.trim() ||
      typeof category !== "string" || !category.trim() ||
      amount === undefined || amount === null || amount === ""
    ) {
      return sendError(res, 400, "user_id, type, name, category, and amount are required.");
    }

    if (!["income", "expense"].includes(type)) {
      return sendError(res, 400, "Transaction type must be income or expense.");
    }

    const numericAmount = toFiniteNumber(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return sendError(res, 400, "Transaction amount must be a positive number.");
    }

    const transaction = await Transaction.create({
      user_id: user_id.trim(),
      type,
      name: name.trim(),
      // Preserve existing callers and legacy categories such as "Salary".
      category: category.trim(),
      amount: numericAmount,
      txn_date: txn_date ?? date ?? null,
      payment_method: payment_method ?? null,
      notes: notes ?? null,
    });

    return res.status(201).json({ transaction: transaction.toJSON() });
  } catch (error) {
    if (error && error.name === "ValidationError") {
      return sendError(res, 400, error.message);
    }
    console.error("Create transaction error:", error);
    return sendError(res, 500, "Could not create transaction.");
  }
});

// FR-06: List transactions for one user, newest first.
app.get("/api/transactions/:userId", async (req, res) => {
  try {
    const transactions = await Transaction.find({ user_id: req.params.userId })
      .sort({ created_at: -1, _id: -1 });

    return res.status(200).json({
      transactions: transactions.map((transaction) => transaction.toJSON()),
    });
  } catch (error) {
    console.error("List transactions error:", error);
    return sendError(res, 500, "Could not retrieve transactions.");
  }
});

// FR-07: Delete only when both user and transaction match.
app.delete("/api/transactions/:userId/:transactionId", async (req, res) => {
  try {
    const { userId, transactionId } = req.params;

    if (!isValidObjectId(transactionId)) {
      return sendError(res, 400, "Invalid transaction ID.");
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: transactionId,
      user_id: userId,
    });

    if (!transaction) return sendError(res, 404, "Transaction not found.");

    return res.status(200).json({ message: "Transaction deleted successfully." });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return sendError(res, 500, "Could not delete transaction.");
  }
});


// Always return JSON for unknown API endpoints.
app.use("/api", (_req, res) => {
  return sendError(res, 404, "API endpoint not found.");
});

// Handle malformed JSON and other request parsing errors.
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return sendError(res, 400, "Invalid JSON request body.");
  }

  if (error.type === "entity.too.large") {
    return sendError(res, 413, "Request body is too large.");
  }

  console.error("Unhandled API error:", error);
  return sendError(res, 500, "Internal server error.");
});

module.exports = app;

// Allow `node server.js` to run the API without opening a listener during tests.
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`SmartBudget API listening on port ${PORT}`));
}
