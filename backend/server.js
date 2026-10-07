const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Transaction = require("./models/Transaction");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// MongoDB connection
// -----------------------------------------------------------------------------

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartbudget";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

// -----------------------------------------------------------------------------
// FR-05: Create income/expense transaction
// -----------------------------------------------------------------------------

app.post("/api/transactions", async (req, res) => {
  try {
    const {
      user_id,
      type,
      name,
      category,
      amount,
      date,
      payment_method,
      notes,
    } = req.body;

    // Required field validation
    if (
      !user_id ||
      !type ||
      !name ||
      !category ||
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        error:
          "user_id, type, name, category and amount are required.",
      });
    }

    // Transaction type validation
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        error: "Type must be either income or expense.",
      });
    }

    // Amount validation
    const parsedAmount = parseFloat(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: "Amount must be a positive number.",
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user_id,
      type,
      name: name.trim(),
      category,
      amount: parsedAmount,
      txn_date: date || null,
      payment_method: payment_method || null,
      notes: notes || null,
    });

    return res.status(201).json({
      transaction,
    });
  } catch (err) {
    console.error("Transaction creation error:", err);

    return res.status(500).json({
      error: "Something went wrong while creating the transaction.",
    });
  }
});

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `SmartBudget FR-05 backend running at http://localhost:${PORT}`
    );
  });
}

module.exports = app;