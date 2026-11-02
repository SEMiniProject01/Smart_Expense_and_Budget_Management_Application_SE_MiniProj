const User = require("../models/User");
const { AppError, isValidObjectId, toFiniteNumber } = require("../utils/http");

async function updateSettings(userId, body = {}) {
  if (!isValidObjectId(userId)) throw new AppError(404, "User not found.");

  const income = toFiniteNumber(body.monthly_income);
  const budget = toFiniteNumber(body.monthly_budget);
  if (!Number.isFinite(income) || !Number.isFinite(budget)) {
    throw new AppError(400, "Monthly income and budget must be numeric.");
  }
  if (income < 0 || budget < 0) {
    throw new AppError(400, "Monthly income and budget cannot be negative.");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { monthly_income: income, monthly_budget: budget } },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError(404, "User not found.");
  return user;
}

module.exports = { updateSettings };
