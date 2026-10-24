import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5001/api";

// FR-10: Categorize supported transaction narrations.
function categorizeNarration(narration, transactionType = "expense") {
  const normalizedNarration = String(narration || "").trim().toLowerCase();

  if (transactionType === "income") {
    return "Income";
  }

  if (!normalizedNarration) {
    return "Other";
  }

  const rules = [
    {
      category: "Food",
      keywords: [
        "swiggy", "zomato", "restaurant", "food", "grocery",
        "groceries", "supermarket", "bakery", "cafe", "coffee",
        "dominos", "pizza", "mcdonald", "kfc",
      ],
    },
    {
      category: "Transport",
      keywords: [
        "uber", "ola", "rapido", "metro", "bus fare", "bus ticket",
        "petrol", "fuel", "diesel", "parking", "toll", "railway",
        "train ticket", "flight ticket", "cab fare", "transport",
      ],
    },
    {
      category: "Shopping",
      keywords: [
        "amazon", "flipkart", "myntra", "shopping", "retail",
        "purchase", "clothing", "clothes", "electronics",
      ],
    },
    {
      category: "Entertainment",
      keywords: [
        "pvr", "inox", "cinema", "movie", "netflix", "spotify",
        "concert", "gaming", "entertainment", "bookmyshow",
      ],
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalizedNarration.includes(keyword))) {
      return rule.category;
    }
  }

  return "Other";
}

function App() {
  // For FR-05 testing, use a fixed test user.
  // This can later be replaced by the logged-in user's ID.
  const userId = "fr05-test-user";

  const [type, setType] = useState("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // FR-06/FR-07: transaction list and deletion state
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [listError, setListError] = useState("");

  // FR-09: CSV upload and parsing state. Kept separate from FR-05/06/07 state.
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);

  // FR-10: Live category preview; backend independently determines the saved category.
  const suggestedCategory = categorizeNarration(name, type);

  const handleTypeChange = (newType) => {
    setType(newType);
    setError("");
    setSuccess("");
  };

  // FR-06: Load transactions for this user.
  const loadTransactions = async () => {
    setLoadingTransactions(true);
    setListError("");

    try {
      const response = await fetch(
        `${API_BASE}/transactions/${encodeURIComponent(userId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load transactions.");
      }

      setTransactions(data.transactions || []);
    } catch (err) {
      setListError(err.message || "Could not load transactions.");
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // FR-07: Delete persisted transactions, or remove local-only entries locally.
  const handleDelete = async (transaction) => {
    setError("");
    setSuccess("");
    setListError("");

    // No ID means this item is local-only and was not persisted in MongoDB.
    if (!transaction.id) {
      setTransactions((current) =>
        current.filter((item) => item !== transaction)
      );
      setSuccess("Local transaction removed from the current list.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${transaction.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(transaction.id);

    try {
      const response = await fetch(
        `${API_BASE}/transactions/${encodeURIComponent(userId)}/${encodeURIComponent(transaction.id)}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete transaction.");
      }

      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id)
      );
      setSuccess("Transaction deleted successfully.");
    } catch (err) {
      setListError(err.message || "Could not delete transaction.");
    } finally {
      setDeletingId("");
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Required field validation
    if (!name.trim() || !amount.trim()) {
      setError("Name and amount are required.");
      return;
    }

    // Amount validation
    const parsedAmount = parseFloat(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          type,
          name: name.trim(),
          amount: parsedAmount,
          category: suggestedCategory,
          date,
          payment_method: paymentMethod,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not create transaction."
        );
      }

      setSuccess("Transaction created successfully.");

      // Refresh the list after a successful save.
      await loadTransactions();

      // Clear form after successful creation
      setName("");
      setAmount("");
        setDate("");
      setPaymentMethod("");
      setNotes("");
      setType("expense");
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend."
      );
    } finally {
      setSaving(false);
    }
  };

  // FR-09: Parse a selected CSV through the backend and show a preview.
  // This does not save imported rows to MongoDB.
  const handleCsvParse = async (event) => {
    event.preventDefault();
    setCsvError("");
    setCsvResult(null);

    if (!csvFile) {
      setCsvError("Please select a CSV file.");
      return;
    }

    if (!csvFile.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Please select a .csv file.");
      return;
    }

    setCsvLoading(true);

    try {
      const csvText = await csvFile.text();
      const response = await fetch(`${API_BASE}/transactions/import/parse`, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csvText,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "CSV parsing failed.");
      }

      setCsvResult(data);
    } catch (err) {
      setCsvError(err.message || "Could not parse the CSV file.");
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7f5",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 500,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>
          Add Transaction
        </h1>

        <p
          style={{
            marginTop: 0,
            color: "#667085",
            fontSize: 14,
          }}
        >
          FR-05 — Create a transaction · FR-10 — Automatic categorization
        </p>

        {/* Transaction type */}
        <div style={{ marginTop: 24 }}>
          <label>
            <strong>Transaction type</strong>
          </label>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 8,
                border: "1px solid #ccc",
                background: type === "expense" ? "#245c46" : "#ffffff",
                color: type === "expense" ? "#ffffff" : "#222222",
                cursor: "pointer",
              }}
            >
              Expense
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 8,
                border: "1px solid #ccc",
                background: type === "income" ? "#245c46" : "#ffffff",
                color: type === "income" ? "#ffffff" : "#222222",
                cursor: "pointer",
              }}
            >
              Income
            </button>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginTop: 18 }}>
          <label>
            <strong>Name</strong>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              type === "income" ? "e.g. Monthly salary" : "e.g. Grocery shopping"
            }
            style={inputStyle}
          />
        </div>

        {/* Amount */}
        <div style={{ marginTop: 18 }}>
          <label>
            <strong>Amount (₹)</strong>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>

        {/* FR-10: Automatically categorized from transaction narration */}
        <div style={{ marginTop: 18 }}>
          <label>
            <strong>Automatic category (FR-10)</strong>
          </label>
          <div
            aria-live="polite"
            style={{
              ...inputStyle,
              background: "#f8faf9",
              color: "#245c46",
              fontWeight: 700,
            }}
          >
            {suggestedCategory}
          </div>
          <p style={{ margin: "6px 0 0", color: "#667085", fontSize: 12 }}>
            Category is inferred from the narration. Unrecognized expense narrations are categorized as Other.
          </p>
        </div>

        {/* Date */}
        <div style={{ marginTop: 18 }}>
          <label>
            <strong>Date (optional)</strong>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Payment method */}
        <div style={{ marginTop: 18 }}>
          <label>
            <strong>Payment method (optional)</strong>
          </label>
          <input
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="UPI, card, cash..."
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div style={{ marginTop: 18 }}>
          <label>
            <strong>Notes (optional)</strong>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 10,
              borderRadius: 8,
              background: "#ffe8e8",
              color: "#b42318",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            style={{
              marginTop: 16,
              padding: 10,
              borderRadius: 8,
              background: "#e8f5e9",
              color: "#216e39",
              fontSize: 14,
            }}
          >
            {success}
          </div>
        )}

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            marginTop: 22,
            padding: 12,
            border: "none",
            borderRadius: 8,
            background: "#b7d957",
            color: "#173b2c",
            fontWeight: 700,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Transaction"}
        </button>

        {/* FR-06 and FR-07: Transaction list */}
        <hr
          style={{
            margin: "28px 0",
            border: "none",
            borderTop: "1px solid #e5e7eb",
          }}
        />

        <h2 style={{ fontSize: 20, marginBottom: 14 }}>
          Transactions
        </h2>

        {listError && (
          <p style={{ color: "#b42318", fontSize: 14 }}>{listError}</p>
        )}

        {loadingTransactions ? (
          <p style={{ color: "#667085" }}>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: "#667085" }}>No transactions found.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {transactions.map((transaction) => (
              <div
                key={
                  transaction.id ||
                  `${transaction.name}-${transaction.amount}-${transaction.date || ""}`
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <div>
                  <strong>{transaction.name}</strong>
                  <div style={{ color: "#667085", fontSize: 13 }}>
                    {transaction.category} · {transaction.type}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    ₹{Number(transaction.amount).toLocaleString("en-IN")}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(transaction)}
                  disabled={Boolean(transaction.id && deletingId === transaction.id)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #f0b4b4",
                    borderRadius: 8,
                    background: "#fff1f1",
                    color: "#b42318",
                    cursor: "pointer",
                  }}
                >
                  {transaction.id && deletingId === transaction.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* FR-09: Bank statement CSV import preview. Existing FR-05/06/07 UI above is unchanged. */}
        <hr
          style={{
            margin: "28px 0",
            border: "none",
            borderTop: "1px solid #e5e7eb",
          }}
        />

        <h2 style={{ fontSize: 20, marginBottom: 8 }}>
          Import Bank Statement (FR-09 / FR-10)
        </h2>
        <p style={{ color: "#667085", fontSize: 14 }}>
          Select a CSV containing Date, Narration, and Debit and/or Credit columns.
        </p>

        <form onSubmit={handleCsvParse}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setCsvFile(event.target.files?.[0] || null);
              setCsvResult(null);
              setCsvError("");
            }}
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <button
            type="submit"
            disabled={csvLoading}
            style={{
              width: "100%",
              padding: 12,
              border: "none",
              borderRadius: 8,
              background: "#245c46",
              color: "#ffffff",
              fontWeight: 700,
              cursor: csvLoading ? "default" : "pointer",
              opacity: csvLoading ? 0.7 : 1,
            }}
          >
            {csvLoading ? "Parsing CSV..." : "Upload and Parse CSV"}
          </button>
        </form>

        {csvError && (
          <p role="alert" style={{ color: "#b42318", fontSize: 14 }}>
            {csvError}
          </p>
        )}

        {csvResult && (
          <div style={{ marginTop: 16 }}>
            <p role="status" style={{ color: "#216e39" }}>
              {csvResult.message} Rows parsed: {csvResult.count}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {["Date", "Narration", "Debit", "Credit", "Type", "Category"].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          textAlign: "left",
                          padding: 8,
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(csvResult.transactions || []).map((row, index) => (
                    <tr key={`${row.date || "row"}-${index}`}>
                      {[row.date, row.narration, row.debit, row.credit, row.type, row.category].map(
                        (value, cellIndex) => (
                          <td
                            key={cellIndex}
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            {value ?? ""}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: 8,
  padding: 11,
  border: "1px solid #d0d5dd",
  borderRadius: 8,
  fontSize: 14,
};

export default App;
