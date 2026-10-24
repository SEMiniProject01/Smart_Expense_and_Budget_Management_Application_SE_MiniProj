import { useState } from "react";

const API_BASE = "http://localhost:5001/api";

const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Other",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Other",
];

function App() {
  // For FR-05 testing, use a fixed test user.
  // This can later be replaced by the logged-in user's ID.
  const userId = "fr05-test-user";

  const [type, setType] = useState("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const categories =
    type === "income"
      ? INCOME_CATEGORIES
      : EXPENSE_CATEGORIES;

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory("");
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Required field validation
    if (!name.trim() || !amount.trim() || !category) {
      setError("Name, amount and category are required.");
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
          category,
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

      // Clear form after successful creation
      setName("");
      setAmount("");
      setCategory("");
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
        <h1
          style={{
            marginTop: 0,
            marginBottom: 6,
          }}
        >
          Add Transaction
        </h1>

        <p
          style={{
            marginTop: 0,
            color: "#667085",
            fontSize: 14,
          }}
        >
          FR-05 — Create an income or expense transaction
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
                background:
                  type === "expense"
                    ? "#245c46"
                    : "#ffffff",
                color:
                  type === "expense"
                    ? "#ffffff"
                    : "#222222",
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
                background:
                  type === "income"
                    ? "#245c46"
                    : "#ffffff",
                color:
                  type === "income"
                    ? "#ffffff"
                    : "#222222",
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
              type === "income"
                ? "e.g. Monthly salary"
                : "e.g. Grocery shopping"
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

        {/* Category */}
        <div style={{ marginTop: 18 }}>
          <label>
            <strong>Category</strong>
          </label>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select a category</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
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
            onChange={(e) =>
              setPaymentMethod(e.target.value)
            }
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
          {saving
            ? "Saving..."
            : "Save Transaction"}
        </button>
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