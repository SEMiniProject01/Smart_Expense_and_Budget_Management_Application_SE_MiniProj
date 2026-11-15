// server.js — SmartBudget API, backed by MongoDB (via Mongoose).
// Same routes and response shapes as the old SQLite version, so the React
// frontend (App.jsx) needs no changes at all.

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("./db"); // establishes the MongoDB connection
const User = require("./models/User");
const Transaction = require("./models/Transaction");
const Goal = require("./models/Goal");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Helper: is this a syntactically valid Mongo ObjectId? Used so a bad/old id
// in a URL param returns a clean 404 instead of a 500 CastError.
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ---- Signup ----
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are all required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password_hash });

    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong creating your account." });
  }
});

// ---- Login ----
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "No account found with that email." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    res.json({ user }); // password_hash is auto-stripped by the schema's toJSON
  } catch (err) {
    res.status(500).json({ error: "Something went wrong logging you in." });
  }
});

// ---- Forgot password, step 1: request a 6-digit reset code ----
// No email service is configured in this project, so the code is printed in
// the BACKEND TERMINAL (dev mode). Swap the console.log for an SMTP/email
// call (e.g. nodemailer) to deliver it to the user's inbox in production.
// The response is identical whether or not the email exists, so this
// endpoint can't be used to discover which emails are registered.
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    let devCode;
    if (user) {
      const code = String(crypto.randomInt(100000, 1000000));
      user.reset_code_hash = await bcrypt.hash(code, 10);
      user.reset_code_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      user.reset_attempts = 0;
      await user.save();
      devCode = code;
      console.log(`\n[SmartBudget] Password reset code for ${user.email}: ${code}  (valid 15 min)\n`);
    }
    res.json({
      message: "If that email is registered, a 6-digit reset code has been issued.",
      dev_code: devCode,
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong starting the reset." });
  }
});

// ---- Forgot password, step 2: verify the code and set a new password ----
app.post("/api/reset-password", async (req, res) => {
  try {
    const { email, code, new_password } = req.body;
    if (!email || !code || !new_password) {
      return res.status(400).json({ error: "Email, code and new password are all required." });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const invalid = { error: "That code is invalid or has expired. Request a new one." };
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.reset_code_hash || !user.reset_code_expires || user.reset_code_expires < new Date()) {
      return res.status(400).json(invalid);
    }
    if (user.reset_attempts >= 5) {
      return res.status(429).json({ error: "Too many wrong attempts. Request a new code." });
    }

    const ok = await bcrypt.compare(String(code).trim(), user.reset_code_hash);
    if (!ok) {
      user.reset_attempts += 1;
      await user.save();
      return res.status(400).json(invalid);
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    user.reset_code_hash = null;
    user.reset_code_expires = null;
    user.reset_attempts = 0;
    await user.save();

    res.json({ message: "Password updated. You can log in now." });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong resetting your password." });
  }
});

// ---- Update a user's monthly income / budget target (Settings screen) ----
app.put("/api/users/:id/settings", async (req, res) => {
  try {
    const { monthly_income, monthly_budget } = req.body;

    const income = parseFloat(monthly_income);
    const budget = parseFloat(monthly_budget);
    if (Number.isNaN(income) || Number.isNaN(budget) || income < 0 || budget < 0) {
      return res.status(400).json({ error: "Monthly income and budget must be numbers ≥ 0." });
    }

    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { monthly_income: income, monthly_budget: budget },
      { new: true } // return the updated document
    );
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong saving your settings." });
  }
});

// ---- List registered users (handy to show in your demo / DBMS report) ----
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong fetching users." });
  }
});

// ---- Add an expense/income transaction ----
app.post("/api/transactions", async (req, res) => {
  try {
    const { user_id, name, category, amount, date, payment_method, notes } = req.body;

    if (!user_id || !name || !category || amount === undefined || amount === null || amount === "") {
      return res.status(400).json({ error: "user_id, name, category and amount are required." });
    }
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount)) {
      return res.status(400).json({ error: "Amount must be a number." });
    }
    if (parsedAmount === 0) {
      return res.status(400).json({ error: "Amount can't be zero." });
    }

    const formattedDate = (date && date !== "null" && String(date).trim())
      ? String(date).trim()
      : new Date().toISOString().slice(0, 10);

    const transaction = await Transaction.create({
      user_id,
      name,
      category,
      amount: parsedAmount,
      txn_date: formattedDate,
      payment_method: payment_method || null,
      notes: notes || null,
    });

    res.status(201).json({ transaction });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong saving that transaction." });
  }
});

// ---- List a user's transactions ----
app.get("/api/transactions/:userId", async (req, res) => {
  try {
    const transactions = await Transaction.find({ user_id: req.params.userId }).sort({ created_at: -1 });
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong fetching transactions." });
  }
});

// ---- Delete a transaction ----
app.delete("/api/transactions/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: "Transaction not found." });
    }
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Transaction not found." });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong deleting that transaction." });
  }
});

// ---- Create a savings goal ----
app.post("/api/goals", async (req, res) => {
  try {
    const { user_id, name, target, current, deadline } = req.body;

    if (!user_id || !name || target === undefined || target === null || target === "") {
      return res.status(400).json({ error: "user_id, name and target are required." });
    }
    const parsedTarget = parseFloat(target);
    const parsedCurrent = parseFloat(current) || 0;
    if (Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({ error: "Target must be a positive number." });
    }

    const goal = await Goal.create({
      user_id,
      name,
      target: parsedTarget,
      current: parsedCurrent,
      deadline: deadline || null,
    });

    res.status(201).json({ goal });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong saving that goal." });
  }
});

// ---- List a user's savings goals ----
app.get("/api/goals/:userId", async (req, res) => {
  try {
    const goals = await Goal.find({ user_id: req.params.userId }).sort({ created_at: -1 });
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong fetching goals." });
  }
});

// ---- Delete a savings goal ----
app.delete("/api/goals/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ error: "Goal not found." });
    }
    const deleted = await Goal.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Goal not found." });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong deleting that goal." });
  }
});

app.listen(PORT, () => {
  console.log(`SmartBudget backend running at http://localhost:${PORT}`);
});