const transactionService = require("../services/transactionService");
const { handleControllerError } = require("../utils/http");

async function parseCsv(req, res) {
  try {
    // Support both the original JSON { csv } form and raw text/csv uploads.
    const csv = typeof req.body === "string" ? req.body : req.body && req.body.csv;
    const rows = transactionService.previewCsv(csv);
    return res.status(200).json({ transactions: rows, rows });
  } catch (error) {
    return handleControllerError(res, error, "Could not parse CSV.", "CSV parse error");
  }
}

async function createTransaction(req, res) {
  try {
    const transaction = await transactionService.createTransaction(req.body || {});
    return res.status(201).json({ transaction: transaction.toJSON() });
  } catch (error) {
    // The original FR-05 endpoint returns model validation errors as HTTP 400.
    if (error && error.name === "ValidationError") {
      return require("../utils/http").sendError(res, 400, error.message);
    }
    return handleControllerError(res, error, "Could not create transaction.", "Create transaction error");
  }
}

async function listTransactions(req, res) {
  try {
    const transactions = await transactionService.listTransactions(req.params.userId);
    return res.status(200).json({ transactions: transactions.map((item) => item.toJSON()) });
  } catch (error) {
    return handleControllerError(res, error, "Could not retrieve transactions.", "List transactions error");
  }
}

async function deleteTransaction(req, res) {
  try {
    await transactionService.deleteTransaction(req.params.userId, req.params.transactionId);
    return res.status(200).json({ message: "Transaction deleted successfully." });
  } catch (error) {
    return handleControllerError(res, error, "Could not delete transaction.", "Delete transaction error");
  }
}

module.exports = { parseCsv, createTransaction, listTransactions, deleteTransaction };
