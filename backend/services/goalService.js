const Goal = require("../models/Goal");
const { AppError, isValidObjectId, toFiniteNumber } = require("../utils/http");

async function createGoal({ user_id, name, target, deadline }) {
  const targetAmount = toFiniteNumber(target);
  if (typeof user_id !== "string" || !user_id.trim() ||
      typeof name !== "string" || !name.trim() ||
      target === undefined || target === null || target === "") {
    throw new AppError(400, "user_id, name, and target are required.");
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new AppError(400, "Goal target must be a positive number.");
  }

  return Goal.create({
    user_id: user_id.trim(),
    name: name.trim(),
    target: targetAmount,
    ...(deadline !== undefined ? { deadline } : {}),
  });
}

async function listGoals(userId) {
  return Goal.find({ user_id: userId }).sort({ created_at: -1 });
}

async function deleteGoal(goalId) {
  if (!isValidObjectId(goalId)) throw new AppError(404, "Savings goal not found.");
  const goal = await Goal.findByIdAndDelete(goalId);
  if (!goal) throw new AppError(404, "Savings goal not found.");
  return goal;
}

module.exports = { createGoal, listGoals, deleteGoal };
