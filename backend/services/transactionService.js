const Transaction = require("../models/Transaction");
const { AppError, isValidObjectId, toFiniteNumber } = require("../utils/http");
const { parseTransactionCsv } = require("../utils/transactionParsing");

async function createTransaction(payload = {}) {
  const { user_id, type, name, category, amount, date, txn_date, payment_method, notes } = payload;

  if (typeof user_id !== "string" || !user_id.trim() ||
      typeof type !== "string" || !type ||
      typeof name !== "string" || !name.trim() ||
      typeof category !== "string" || !category.trim() ||
      amount === undefined || amount === null || amount === "") {
    throw new AppError(400, "user_id, type, name, category, and amount are required.");
  }
  if (!["income", "expense"].includes(type)) {
    throw new AppError(400, "Transaction type must be income or expense.");
  }

  const numericAmount = toFiniteNumber(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new AppError(400, "Transaction amount must be a positive number.");
  }

  return Transaction.create({
    user_id: user_id.trim(),
    type,
    name: name.trim(),
    // Keep caller-supplied legacy categories such as "Salary" unchanged.
    category: category.trim(),
    amount: numericAmount,
    txn_date: txn_date ?? date ?? null,
    payment_method: payment_method ?? null,
    notes: notes ?? null,
  });
}

async function listTransactions(userId) {
  return Transaction.find({ user_id: userId }).sort({ created_at: -1, _id: -1 });
}

async function deleteTransaction(userId, transactionId) {
  if (!isValidObjectId(transactionId)) throw new AppError(400, "Invalid transaction ID.");
  const transaction = await Transaction.findOneAndDelete({ _id: transactionId, user_id: userId });
  if (!transaction) throw new AppError(404, "Transaction not found.");
  return transaction;
}

function previewCsv(csv) {
  return parseTransactionCsv(csv);
}

module.exports = { createTransaction, listTransactions, deleteTransaction, previewCsv };
