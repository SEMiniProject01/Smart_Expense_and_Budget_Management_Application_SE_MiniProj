// models/Transaction.js — transaction schema.
// Category intentionally remains a required string rather than a strict enum:
// existing callers/tests use legacy values such as "Salary". FR-10 categorization
// is applied to imported CSV narration without breaking those existing records.

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    txn_date: {
      type: String,
      default: null,
    },
    payment_method: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false,
    },
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
