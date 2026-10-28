const mongoose = require("mongoose");

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === String(id);
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return NaN;
  return Number(value);
}

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

function handleControllerError(res, error, fallbackMessage, logLabel) {
  if (error instanceof AppError) return sendError(res, error.status, error.message);
  if (error && error.code === 11000) {
    return sendError(res, 409, "An account with this email already exists.");
  }
  console.error(`${logLabel}:`, error);
  return sendError(res, 500, fallbackMessage);
}

module.exports = { sendError, isValidObjectId, toFiniteNumber, AppError, handleControllerError };
