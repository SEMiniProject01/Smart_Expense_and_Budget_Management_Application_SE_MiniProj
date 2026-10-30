// models/Goal.js — one document per savings goal, linked to the user who
// created it via user_id (same pattern as Transaction.user_id).

const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    target: { type: Number, required: true },
    current: { type: Number, required: true, default: 0 },
    deadline: { type: String, default: null },
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

module.exports = mongoose.model("Goal", goalSchema);
