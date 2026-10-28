const API_BASE = "http://localhost:5001/api";

async function parseJsonResponse(response, fallbackMessage) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }
  return data;
}

export async function fetchTransactions(userId) {
  const response = await fetch(
    `${API_BASE}/transactions/${encodeURIComponent(userId)}`
  );
  const data = await parseJsonResponse(response, "Could not load transactions.");
  return data.transactions || [];
}

export async function createTransaction(payload) {
  const response = await fetch(`${API_BASE}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response, "Could not create transaction.");
}

export async function deleteTransaction(userId, transactionId) {
  const response = await fetch(
    `${API_BASE}/transactions/${encodeURIComponent(userId)}/${encodeURIComponent(transactionId)}`,
    { method: "DELETE" }
  );
  return parseJsonResponse(response, "Could not delete transaction.");
}

export async function parseTransactionCsv(csvText) {
  const response = await fetch(`${API_BASE}/transactions/import/parse`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csvText,
  });
  return parseJsonResponse(response, "CSV parsing failed.");
}
