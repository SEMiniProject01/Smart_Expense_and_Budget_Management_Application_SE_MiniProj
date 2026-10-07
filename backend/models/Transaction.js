const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },

    // FR-05: transaction type
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    // FR-05: transaction name
    name: {
      type: String,
      required: true,
    },

    // FR-05: transaction category
    category: {
      type: String,
      required: true,
    },

    // FR-05: transaction amount
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Optional transaction details
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