const express = require("express");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const goalRoutes = require("./routes/goals");
const transactionRoutes = require("./routes/transactions");

const app = express();

// JSON APIs and raw CSV uploads are supported without changing existing clients.
app.use(express.json({ limit: "2mb" }));
app.use(express.text({ type: ["text/csv", "application/csv"], limit: "2mb" }));

app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", goalRoutes);
app.use("/api/transactions", transactionRoutes);

// Keep unknown API endpoints in the existing JSON error format.
app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint not found." }));

// Preserve the original application's request parsing/error behaviour across both branches.
app.use((error, _req, res, _next) => {
  if (error && error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }

  if (error && error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }

  console.error("Unhandled API error:", error);
  return res.status(500).json({ error: "Internal server error." });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  require("./db");
  app.listen(PORT, () => console.log(`SmartBudget API listening on port ${PORT}`));
}
