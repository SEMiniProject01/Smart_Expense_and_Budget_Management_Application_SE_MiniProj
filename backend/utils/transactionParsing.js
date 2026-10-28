const { AppError } = require("./http");

function categorizeNarration(narration, type = "expense") {
  const text = String(narration || "").toLowerCase();
  if (type === "income") return "Income";

  const rules = [
    ["Food", ["food", "lunch", "dinner", "breakfast", "snack", "swiggy", "zomato",
      "restaurant", "grocery", "groceries", "supermarket", "bakery", "cafe",
      "coffee", "dominos", "pizza", "mcdonald", "kfc"]],
    ["Transport", ["transport", "uber", "ola", "rapido", "metro", "bus", "petrol", "fuel",
      "diesel", "parking", "toll", "railway", "train", "flight", "cab"]],
    ["Shopping", ["shopping", "amazon", "flipkart", "myntra", "retail", "purchase",
      "clothing", "clothes", "electronics"]],
    ["Entertainment", ["entertainment", "pvr", "inox", "cinema", "movie", "netflix",
      "spotify", "concert", "gaming", "bookmyshow"]],
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return "Other";
}

function parseCSVLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field.trim());
  return fields;
}

function parseAmount(value) {
  const cleaned = String(value ?? "").replace(/[,₹$\s]/g, "").trim();
  if (!cleaned) return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : NaN;
}

function parseTransactionCsv(csv) {
  if (typeof csv !== "string" || !csv.trim()) {
    throw new AppError(400, "CSV content is required.");
  }

  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new AppError(400, "CSV must include a header and at least one data row.");
  }

  const headers = parseCSVLine(lines[0]).map((header) => header.toLowerCase().trim());
  const dateIndex = headers.findIndex((h) => ["date", "transaction date", "txn_date"].includes(h));
  const narrationIndex = headers.findIndex((h) => ["narration", "description", "details", "particulars", "name"].includes(h));
  const debitIndex = headers.findIndex((h) => ["debit", "withdrawal", "withdrawals", "debit amount"].includes(h));
  const creditIndex = headers.findIndex((h) => ["credit", "deposit", "deposits", "credit amount"].includes(h));

  if (dateIndex < 0 || narrationIndex < 0 || (debitIndex < 0 && creditIndex < 0)) {
    throw new AppError(400, "CSV must contain Date, Narration, and Debit and/or Credit columns.");
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const fields = parseCSVLine(lines[i]);
    if (fields.every((field) => !field)) continue;
    const debit = debitIndex >= 0 ? parseAmount(fields[debitIndex] || "") : 0;
    const credit = creditIndex >= 0 ? parseAmount(fields[creditIndex] || "") : 0;

    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      throw new AppError(400, `Invalid debit or credit amount on CSV row ${i + 1}.`);
    }
    if (debit > 0 && credit > 0) {
      throw new AppError(400, `CSV row ${i + 1} cannot have both debit and credit amounts.`);
    }

    const narration = fields[narrationIndex] || "";
    const type = credit > 0 ? "income" : "expense";
    rows.push({
      date: fields[dateIndex] || "",
      narration,
      debit,
      credit,
      type,
      category: categorizeNarration(narration, type),
    });
  }
  return rows;
}

module.exports = { categorizeNarration, parseCSVLine, parseAmount, parseTransactionCsv };
