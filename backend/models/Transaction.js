// models/Transaction.js — one document per expense/income entry, linked to
// the user who created it via user_id (the user's Mongo _id, as a string —
// not a strict Mongo ref, kept simple like the old SQLite foreign key).

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    txn_date: { type: String, default: null },
    payment_method: { type: String, default: null },
    notes: { type: String, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
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
