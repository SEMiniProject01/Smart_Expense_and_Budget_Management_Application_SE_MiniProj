
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
        error: "user_id, type, name, category and amount are required.",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        error: "Type must be either income or expense.",
      });
    }

    const parsedAmount = parseFloat(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: "Amount must be a positive number.",
      });
    }

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

    return res.status(201).json({ transaction });
  } catch (err) {
    console.error("Transaction creation error:", err);

    return res.status(500).json({
      error: "Something went wrong while creating the transaction.",
    });
  }
});

// -----------------------------------------------------------------------------
// FR-06: List transactions for the requesting user
// -----------------------------------------------------------------------------

app.get("/api/transactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !userId.trim()) {
      return res.status(400).json({
        error: "user_id is required.",
      });
    }

    const transactions = await Transaction.find({
      user_id: userId,
    }).sort({ created_at: -1 });

    return res.status(200).json({ transactions });
  } catch (err) {
    console.error("Transaction listing error:", err);

    return res.status(500).json({
      error: "Something went wrong while fetching transactions.",
    });
  }
});

// -----------------------------------------------------------------------------
// FR-07: Delete a persisted transaction belonging to the requesting user
// -----------------------------------------------------------------------------

app.delete(
  "/api/transactions/:userId/:transactionId",
  async (req, res) => {
    try {
      const { userId, transactionId } = req.params;

      if (!userId || !userId.trim()) {
        return res.status(400).json({
          error: "user_id is required.",
        });
      }

      if (!mongoose.isValidObjectId(transactionId)) {
        return res.status(400).json({
          error: "Invalid transaction ID.",
        });
      }

      const deletedTransaction = await Transaction.findOneAndDelete({
        _id: transactionId,
        user_id: userId,
      });

      if (!deletedTransaction) {
        return res.status(404).json({
          error: "Transaction not found for this user.",
        });
      }

      return res.status(200).json({
        message: "Transaction deleted successfully.",
        transactionId: deletedTransaction._id.toString(),
      });
    } catch (err) {
      console.error("Transaction deletion error:", err);

      return res.status(500).json({
        error: "Something went wrong while deleting the transaction.",
      });
    }
  }
);

// -----------------------------------------------------------------------------
// FR-09: CSV statement parsing helper
// Supports quoted fields, commas inside quoted fields, and escaped quotes.
// -----------------------------------------------------------------------------

function parseCsvLineContent(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const character = csvText[i];

    if (insideQuotes) {
      if (character === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      insideQuotes = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csvText[i + 1] === "\n") {
        i += 1;
      }

      row.push(field.trim());
      field = "";

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      field += character;
    }
  }

  if (insideQuotes) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());

    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

// -----------------------------------------------------------------------------
// FR-09: Parse an imported CSV bank statement
// POST /api/transactions/import/parse
// Content-Type: text/csv
//
// Required columns: Date, Narration, and Debit and/or Credit.
// This endpoint parses and previews rows; it does not save transactions.
// -----------------------------------------------------------------------------

app.post(
  "/api/transactions/import/parse",
  express.text({
    type: ["text/csv", "text/plain"],
    limit: "5mb",
  }),
  (req, res) => {
    try {
      if (typeof req.body !== "string" || !req.body.trim()) {
        return res.status(400).json({
          error: "Please upload a non-empty CSV file.",
        });
      }

      const csvText = req.body.replace(/^\uFEFF/, "");
      const parsedRows = parseCsvLineContent(csvText);

      if (parsedRows.length < 2) {
        return res.status(400).json({
          error: "The CSV must contain a header row and at least one data row.",
        });
      }

      const headers = parsedRows[0].map((header) =>
        header.trim().toLowerCase()
      );

      if (headers.some((header) => !header)) {
        return res.status(400).json({
          error: "CSV headers must not be empty.",
        });
      }

      if (new Set(headers).size !== headers.length) {
        return res.status(400).json({
          error: "CSV contains duplicate column headers.",
        });
      }

      const hasDate = headers.includes("date");
      const hasNarration = headers.includes("narration");
      const hasDebit = headers.includes("debit");
      const hasCredit = headers.includes("credit");

      if (!hasDate || !hasNarration || (!hasDebit && !hasCredit)) {
        return res.status(400).json({
          error:
            "CSV must contain Date, Narration, and at least one Debit or Credit column.",
        });
      }

      const transactions = [];

      for (let i = 1; i < parsedRows.length; i += 1) {
        const values = parsedRows[i];

        if (values.length !== headers.length) {
          return res.status(400).json({
            error: `Row ${i + 1} has ${values.length} fields; expected ${headers.length}.`,
          });
        }

        const row = {};

        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        if (!row.date || !row.narration) {
          return res.status(400).json({
            error: `Row ${i + 1}: Date and Narration are required.`,
          });
        }

        transactions.push({
          date: row.date,
          narration: row.narration,
          debit: row.debit || "",
          credit: row.credit || "",
        });
      }

      return res.status(200).json({
        message: "CSV parsed successfully.",
        count: transactions.length,
        transactions,
      });
    } catch (err) {
      console.error("CSV parsing error:", err.message);

      return res.status(400).json({
        error: err.message || "Unable to parse the CSV file.",
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `SmartBudget FR-05/FR-06/FR-07/FR-09 backend running at http://localhost:${PORT}`
    );
  });
}

module.exports = app;
