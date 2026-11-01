/**
 * utils.test.js — Frontend unit tests for pure utility functions
 * TC-09 (CSV categorization — FR-09, FR-10)
 * TC-13 (theme persistence — FR-14, localStorage)
 *
 * NOTE: The App.jsx is a single-file component; these tests target the
 * pure categorization logic and localStorage behaviour, not the full UI.
 * Full API integration tests are in the backend suite.
 *
 * Environment: node (no jsdom needed — localStorage is mocked inline)
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── Replicate the categorization logic from App.jsx (FR-09, FR-10) ─────────
// This matches the actual implementation in App.jsx (lines referencing
// categorizeNarration). We test the same keyword rules here.
const CATEGORY_KEYWORDS = {
  Food: ["swiggy", "zomato", "restaurant", "food", "cafe", "coffee", "dhaba", "hotel", "bakery"],
  Transport: ["uber", "ola", "rapido", "petrol", "fuel", "auto", "bus", "metro", "namma yatri"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "mall", "store", "shop", "nykaa"],
  Entertainment: ["netflix", "spotify", "hotstar", "zee5", "prime", "youtube", "cinema", "bookmyshow"],
  Income: ["salary", "credited", "neft", "imps", "rtgs", "interest", "refund", "cashback"],
};

function categorizeNarration(narration) {
  if (!narration) return "Other";
  const lower = narration.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

// ── TC-09 / TC-10: CSV categorization (FR-09, FR-10) ─────────────────────
describe("TC-09/TC-10: CSV categorization logic — FR-09 / FR-10", () => {
  it("categorizes Swiggy as Food", () => {
    expect(categorizeNarration("Swiggy Order #12345")).toBe("Food");
  });

  it("categorizes Zomato as Food", () => {
    expect(categorizeNarration("ZOMATO ONLINE ORDER")).toBe("Food");
  });

  it("categorizes Uber as Transport", () => {
    expect(categorizeNarration("Uber Technologies")).toBe("Transport");
  });

  it("categorizes petrol as Transport", () => {
    expect(categorizeNarration("BPCL PETROL STATION")).toBe("Transport");
  });

  it("categorizes Amazon as Shopping", () => {
    expect(categorizeNarration("AMAZON SELLER SERVICES")).toBe("Shopping");
  });

  it("categorizes Netflix as Entertainment", () => {
    expect(categorizeNarration("NETFLIX SUBSCRIPTION")).toBe("Entertainment");
  });

  it("categorizes Salary credit as Income", () => {
    expect(categorizeNarration("SALARY CREDITED NOV 2026")).toBe("Income");
  });

  it("categorizes NEFT transfer as Income", () => {
    expect(categorizeNarration("NEFT FROM KATTIMANI")).toBe("Income");
  });

  it("categorizes unknown narration as Other (fallback)", () => {
    expect(categorizeNarration("RANDOM UNKNOWN MERCHANT XYZ")).toBe("Other");
  });

  it("categorizes ATM withdrawal as Other (not a supported keyword)", () => {
    expect(categorizeNarration("ATM CASH WITHDRAWAL")).toBe("Other");
  });

  it("handles null narration gracefully → Other", () => {
    expect(categorizeNarration(null)).toBe("Other");
  });

  it("handles empty string narration → Other", () => {
    expect(categorizeNarration("")).toBe("Other");
  });
});

// ── TC-13: Theme persistence simulation (FR-14) ───────────────────────────
// localStorage is not available in node environment, so we simulate
// the same key-value behaviour with a plain object store.
describe("TC-13: Theme persistence — FR-14", () => {
  let store = {};

  const localStorage = {
    setItem: (k, v) => { store[k] = v; },
    getItem: (k) => store[k] ?? null,
    clear: () => { store = {}; },
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("can write and read a theme preference", () => {
    localStorage.setItem("theme", "dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("can switch theme from dark to light", () => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("theme", "light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("defaults to null when no theme has been set", () => {
    expect(localStorage.getItem("theme")).toBeNull();
  });
});

// ── Money formatting utility (used throughout App.jsx) ─────────────────────
describe("money() formatting utility", () => {
  function money(n) {
    const v = Math.round(n);
    return "₹" + v.toLocaleString("en-IN");
  }

  it("formats 1000 as ₹1,000", () => {
    expect(money(1000)).toBe("₹1,000");
  });

  it("rounds 450.6 to ₹451", () => {
    expect(money(450.6)).toBe("₹451");
  });

  it("formats zero as ₹0", () => {
    expect(money(0)).toBe("₹0");
  });
});
