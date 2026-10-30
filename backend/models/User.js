// models/User.js — Mongoose schema for a SmartBudget user.
// monthly_income / monthly_budget are user-set targets (edited from
// Settings), not derived from transactions — same as in the old SQLite schema.

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    monthly_income: { type: Number, required: true, default: 0 },
    monthly_budget: { type: Number, required: true, default: 0 },
    // Password-reset state: a hashed 6-digit code, its expiry, and a counter
    // that limits guessing. All three are stripped from API responses.
    reset_code_hash: { type: String, default: null },
    reset_code_expires: { type: Date, default: null },
    reset_attempts: { type: Number, default: 0 },
  },
  {
    // Adds created_at automatically, same field name as the old SQLite column.
    timestamps: { createdAt: "created_at", updatedAt: false },
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password_hash; // never leak the hash to the client
        delete ret.reset_code_hash;
        delete ret.reset_code_expires;
        delete ret.reset_attempts;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("User", userSchema);