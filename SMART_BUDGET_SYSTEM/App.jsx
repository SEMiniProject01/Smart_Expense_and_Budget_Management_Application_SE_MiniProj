import Papa from "papaparse";
import "./App.css";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, BarChart3, FileText, Target,
  Settings, Bell, Plus, Search, ChevronDown, TrendingUp, TrendingDown,
  Utensils, Fuel, Briefcase, ShoppingBag, X, Sparkles, AlertTriangle,
  Radio, Download, Calendar, ArrowRight, Coins, Upload, Loader2, CheckCircle2, Trash2, Sun, Moon
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

/* ---------------------------------------------------------
   SmartBudget — fintech dashboard prototype
   Palette: dark forest green / soft lime / off-white
--------------------------------------------------------- */

const LIGHT_COLORS = {
  forestDark: "#0B2018",
  forest: "#123526",
  forestMid: "#1C4633",
  lime: "#A9E24C",
  limeSoft: "#DCF2AE",
  cream: "#F6F4EC",
  white: "#FFFFFF",
  ink: "#152119",
  slate: "#6C7A70",
  amber: "#D79A3B",
  amberBg: "#FBEFD9",
  red: "#D2574A",
  redBg: "#FBE7E4",   
  green: "#3E8E5C",
  greenBg: "#E4F3E7",
  border: "#E7E4D8",
};

// Dark palette — same keys, so every existing COLORS.xxx reference in the
// codebase automatically themes correctly without being touched.
const DARK_COLORS = {
  forestDark: "#050D09",
  forest: "#0F1F17",
  forestMid: "#1C3A2A",
  lime: "#B9EE63",
  limeSoft: "#25391E",
  cream: "#10160F",
  white: "#182119",
  ink: "#EDF3E9",
  slate: "#93A395",
  amber: "#E0AA55",
  amberBg: "#3A2E17",
  red: "#E17C6E",
  redBg: "#3B211D",
  green: "#68C48A",
  greenBg: "#173323",
  border: "#2A362D",
};

// COLORS is a mutable module-level binding (not a const) so that toggling
// the theme and re-rendering the tree is enough for every component's
// `COLORS.xxx` lookups to pick up the new palette — no need to thread a
// theme prop through 20+ components individually.
let COLORS = LIGHT_COLORS;

function money(n, opts = {}) {
  const v = Math.round(n);
  return "₹" + v.toLocaleString("en-IN", opts);
}

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { key: "budgets", label: "Budgets", icon: Wallet },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "goals", label: "Savings Goals", icon: Target },
];

/* Historical demo arrays (spendData, budgetCats) were removed — all charts
   now derive from real per-user transactions instead of fixed placeholders. */

const initialTransactions = [
  { id: 1, name: "Swiggy", cat: "Food", when: "Today", amount: -450, icon: Utensils, tone: "amber" },
  { id: 2, name: "Petrol", cat: "Transport", when: "Yesterday", amount: -1200, icon: Fuel, tone: "forest" },
  { id: 3, name: "Monthly Salary", cat: "Income", when: "Aug 1", amount: 55000, icon: Briefcase, tone: "lime" },
  { id: 4, name: "Amazon", cat: "Shopping", when: "Jul 31", amount: -2799, icon: ShoppingBag, tone: "red" },
];

/* Simulated incoming-transaction feed. In a real integration this would
   come from a bank/UPI webhook — here it's a fixed pool the detector
   "discovers" automatically, one at a time, no manual form-filling. */
const incomingFeed = [
  { name: "Zomato", cat: "Food", amount: -380, icon: Utensils, tone: "amber", merchant: "ZOMATO" },
  { name: "Uber", cat: "Transport", amount: -260, icon: Fuel, tone: "forest", merchant: "UBER" },
  { name: "Myntra", cat: "Shopping", amount: -1899, icon: ShoppingBag, tone: "red", merchant: "MYNTRA" },
  { name: "BookMyShow", cat: "Entertainment", amount: -540, icon: ShoppingBag, tone: "amber", merchant: "BOOKMYSHOW" },
  { name: "Ola", cat: "Transport", amount: -175, icon: Fuel, tone: "forest", merchant: "OLA" },
];

/* Keyword-based auto-categorization, mimicking how a real statement
   parser would classify UPI/NEFT narration strings. */
const CATEGORY_RULES = [
  { keywords: ["swiggy", "zomato", "bigbasket", "food"], cat: "Food", icon: Utensils, tone: "amber" },
  { keywords: ["uber", "ola", "petrol", "fuel", "hpretail"], cat: "Transport", icon: Fuel, tone: "forest" },
  { keywords: ["amazon", "myntra", "flipkart", "ajio"], cat: "Shopping", icon: ShoppingBag, tone: "red" },
  { keywords: ["netflix", "bookmyshow", "starbucks", "spotify", "prime"], cat: "Entertainment", icon: ShoppingBag, tone: "amber" },
  { keywords: ["salary", "freelance", "payout", "credit"], cat: "Income", icon: Briefcase, tone: "lime" },
];

// Parses a transaction date that could come from two different sources in
// two different formats: the date picker in Add Expense (ISO, YYYY-MM-DD)
// or a bank-statement CSV import (Indian format, DD/MM/YYYY). Plain
// `new Date(string)` assumes US MM/DD/YYYY for slash-separated dates, which
// silently misreads every DD/MM/YYYY date where the day is 12 or less (and
// throws out anything with a day above 12 entirely) — scattering a single
// month's transactions across the wrong months on every chart.
function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr);
  if (dmy) {
    const day = Number(dmy[1]), month = Number(dmy[2]), year = Number(dmy[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// The most recent date among this user's transactions, or today if there
// are none / none have a parseable date. Charts anchor their "last 6
// months" window to this instead of the wall-clock date, so imported
// historical statements (e.g. a full year of 2025 data, uploaded in 2026)
// still land inside the visible window instead of the chart silently
// showing six empty real-world months that don't overlap the data at all.
function latestTransactionDate(transactions) {
  let latest = null;
  transactions.forEach((t) => {
    const d = parseFlexibleDate(t.when);
    if (d && (!latest || d > latest)) latest = d;
  });
  return latest || new Date();
}

function categorizeNarration(text) {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return { cat: rule.cat, icon: rule.icon, tone: rule.tone };
    }
  }
  return { cat: "Other", icon: ShoppingBag, tone: "forest" };
}

function cleanMerchantName(narration) {
  // "UPI-SWIGGY-swiggy@icici-451234567890" -> "Swiggy"
  const parts = narration.split(/[-\/]/).map((p) => p.trim()).filter(Boolean);
  const skip = ["upi", "neft", "atm", "wdl", "imps", "rtgs"];
  const core = parts.find((p) => !skip.includes(p.toLowerCase()) && !/@/.test(p) && !/^\d+$/.test(p)) || parts[0] || narration;
  return core
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
    .slice(0, 30);
}



function Pill({ tone = "slate", children }) {
  const map = {
    green: { bg: COLORS.greenBg, fg: COLORS.green },
    red: { bg: COLORS.redBg, fg: COLORS.red },
    amber: { bg: COLORS.amberBg, fg: COLORS.amber },
    lime: { bg: COLORS.limeSoft, fg: "#3D6B14" },
    slate: { bg: "#EFEEE4", fg: COLORS.slate },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: map.bg, color: map.fg, fontSize: 12, fontWeight: 600,
      padding: "3px 9px", borderRadius: 999,
    }}>{children}</span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: COLORS.white, borderRadius: 16, border: `1px solid ${COLORS.border}`,
      padding: 20, boxShadow: "0 1px 2px rgba(11,32,24,0.04)", ...style,
    }}>{children}</div>
  );
}

function IconBadge({ icon: Icon, tone = "forest", size = 36 }) {
  const map = {
    forest: { bg: "#EAF0EA", fg: COLORS.forest },
    lime: { bg: COLORS.limeSoft, fg: "#3D6B14" },
    amber: { bg: COLORS.amberBg, fg: COLORS.amber },
    red: { bg: COLORS.redBg, fg: COLORS.red },
  }[tone];
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: map.bg, color: map.fg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon size={size * 0.5} />
    </div>
  );
}

function ProgressBar({ pct, tone }) {
  const color = tone === "red" ? COLORS.red : tone === "amber" ? COLORS.amber : COLORS.green;
  return (
    <div style={{ height: 8, background: "#EEEDE3", borderRadius: 999, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 999,
        transition: "width .3s ease",
      }} />
    </div>
  );
}

function statusTone(spent, total) {
  const pct = (spent / total) * 100;
  if (pct > 100) return "red";
  if (pct >= 85) return "amber";
  return "green";
}

/* ---------------- sidebar ---------------- */

function Sidebar({ active, onNav, user, theme, toggleTheme }) {
  const initials = (user?.name || "Aniket Sen")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside style={{
      width: 240, minWidth: 240, background: COLORS.forestDark, color: "#EFF3EC",
      display: "flex", flexDirection: "column", padding: "24px 16px",
      fontFamily: "'Inter', sans-serif", height: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 28px" }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: COLORS.lime,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Coins size={18} color={COLORS.forestDark} />
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, letterSpacing: -0.2 }}>
          SmartBudget
        </span>
      </div>

      {/* Primary navigation: all six destinations are keyboard accessible buttons. */}
      <nav
        aria-label="Primary navigation"
        style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}
      >
        {NAV.map(({ key, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNav(key)}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                background: isActive ? "rgba(169,226,76,0.14)" : "transparent",
                color: isActive ? COLORS.lime : "#C7D2C9",
                borderLeft: isActive ? `3px solid ${COLORS.lime}` : "3px solid transparent",
              }}
            >
              <Icon size={17} aria-hidden="true" focusable="false" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#274B37",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: COLORS.lime,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#F3F6F1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.name || "Aniket Sen"}
          </div>
          <div style={{ fontSize: 11.5, color: "#9AAA9E" }}>Personal Account</div>
        </div>
        <button
          type="button"
          onClick={() => onNav("settings")}
          title="Settings"
          aria-label="Open settings"
          aria-current={active === "settings" ? "page" : undefined}
          style={{ border: "none", background: "none", cursor: "pointer", display: "flex", padding: 4 }}
        >
          <Settings size={16} color="#9AAA9E" aria-hidden="true" focusable="false" />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
          style={{ border: "none", background: "none", cursor: "pointer", display: "flex", padding: 4 }}
        >
          {theme === "dark"
            ? <Sun size={16} color="#9AAA9E" aria-hidden="true" focusable="false" />
            : <Moon size={16} color="#9AAA9E" aria-hidden="true" focusable="false" />}
        </button>
      </div>
    </aside>
  );
}

/* ---------------- header ---------------- */

function Header({ title, subtitle, onAdd, onUpload, uploading, onNav, transactions = [], user }) {
  const [showNotifs, setShowNotifs] = useState(false);

  // Real notifications derived from this user's actual data — no more fixed
  // "Shopping Budget Alert" / "18% higher" text shown to everyone.
  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const hasBudget = (user?.monthly_budget ?? 0) > 0;
  const hasIncome = (user?.monthly_income ?? 0) > 0;

  const categorySpend = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    categorySpend[t.cat] = (categorySpend[t.cat] || 0) + Math.abs(t.amount);
  });
  const topCategory = Object.entries(categorySpend).sort((a, b) => b[1] - a[1])[0];

  const notifications = [];

  if (hasBudget) {
    const pctUsed = (totalExpenses / user.monthly_budget) * 100;
    if (pctUsed >= 100) {
      notifications.push({
        id: "over-budget", icon: AlertTriangle, tone: "red", title: "Over Budget",
        body: `You've spent ${money(totalExpenses)}, which is over your ${money(user.monthly_budget)} monthly budget.`,
      });
    } else if (pctUsed >= 80) {
      notifications.push({
        id: "budget-alert", icon: AlertTriangle, tone: "amber", title: "Budget Alert",
        body: `You've used ${Math.round(pctUsed)}% of your ${money(user.monthly_budget)} monthly budget.`,
      });
    }
  }

  if (topCategory) {
    notifications.push({
      id: "top-category", icon: TrendingUp, tone: "forest", title: "Top Spending Category",
      body: `${topCategory[0]} is your biggest expense this period at ${money(topCategory[1])}.`,
    });
  }

  if (hasIncome) {
    const savingsPct = ((totalIncome - totalExpenses) / user.monthly_income) * 100;
    if (savingsPct < 10) {
      notifications.push({
        id: "savings-opportunity", icon: Target, tone: "lime", title: "Savings Opportunity",
        body: "You're saving less than 10% of your income this period — consider trimming discretionary spend.",
      });
    }
  }

  // Dismissed notifications stay hidden for this Header instance (resets if
  // you navigate away and back, since fresh alerts may apply by then).
  const [dismissedIds, setDismissedIds] = useState([]);
  const visibleNotifications = notifications.filter((n) => !dismissedIds.includes(n.id));

  if (visibleNotifications.length === 0) {
    visibleNotifications.push({
      id: "empty", isFallback: true, icon: Bell, tone: "forest", title: "All caught up",
      body: transactions.length === 0
        ? "No notifications yet — add some transactions to get personalized alerts."
        : "No alerts right now — you're on track.",
    });
  }

  const initials = (user?.name || "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: 0, color: COLORS.ink }}>
          {title}
        </h1>
        <p style={{ margin: "4px 0 0", color: COLORS.slate, fontSize: 14 }}>{subtitle}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            style={{
              width: 38, height: 38, borderRadius: 10, border: `1px solid ${COLORS.border}`,
              background: COLORS.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              position: "relative",
            }}
          >
            <Bell size={16} color={COLORS.ink} />
            {notifications.length > 0 && (
              <span style={{
                position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%",
                background: COLORS.red, border: `1.5px solid ${COLORS.white}`,
              }} />
            )}
          </button>

          {showNotifs && (
            <>
              <div onClick={() => setShowNotifs(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", top: 46, right: 0, width: 300, background: COLORS.white,
                border: `1px solid ${COLORS.border}`, borderRadius: 14, boxShadow: "0 12px 32px rgba(11,32,24,0.14)",
                padding: 12, zIndex: 50,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 10px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>Notifications</div>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => setDismissedIds(notifications.map((n) => n.id))}
                      style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: COLORS.slate }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {visibleNotifications.map((n) => (
                    <div key={n.id} style={{ display: "flex", gap: 10, padding: 8, borderRadius: 10, background: COLORS.cream }}>
                      <IconBadge icon={n.icon} tone={n.tone} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink }}>{n.title}</div>
                        <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                      </div>
                      {!n.isFallback && (
                        <button
                          onClick={() => setDismissedIds((prev) => [...prev, n.id])}
                          title="Remove notification"
                          style={{ border: "none", background: "none", cursor: "pointer", padding: 2, height: "fit-content", color: COLORS.slate }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => onNav && onNav("settings")}
          title="Account settings"
          style={{
            width: 38, height: 38, borderRadius: "50%", background: COLORS.forest,
            color: COLORS.lime, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
          }}
        >
          {initials}
        </button>
        {onUpload && (
          <label style={{
            display: "flex", alignItems: "center", gap: 7, background: COLORS.white, color: COLORS.ink,
            border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 16px", fontSize: 13.5,
            fontWeight: 600, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.7 : 1,
          }}>
            {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
            {uploading ? "Parsing…" : "Upload statement"}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </label>
        )}
        <button onClick={onAdd} style={{
          display: "flex", alignItems: "center", gap: 7, background: COLORS.lime, color: COLORS.forestDark,
          border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
        }}>
          <Plus size={15} /> Add Expense
        </button>
      </div>
    </div>
  );
}

/* ---------------- Dashboard screen ---------------- */

function SavingsRing({ pct }) {
  const r = 42, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={104} height={104} viewBox="0 0 104 104">
      <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
      <circle
        cx="52" cy="52" r={r} fill="none" stroke={COLORS.lime} strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 52 52)"
      />
      <text x="52" y="49" textAnchor="middle" fill="#fff" fontSize="19" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {pct}%
      </text>
      <text x="52" y="66" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9.5">
        Savings
      </text>
    </svg>
  );
}

function AutoDetectionCard({ onDetected }) {
  const steps = ["Transaction detected", "Reading merchant", "Auto-categorized", "Budget updated"];
  const [stepIndex, setStepIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [lastTxn, setLastTxn] = useState(null);
  const [feedPos, setFeedPos] = useState(0);

  const runDetection = () => {
    if (running) return;
    const source = incomingFeed[feedPos % incomingFeed.length];
    setFeedPos((p) => p + 1);
    setRunning(true);
    setLastTxn(source);
    setStepIndex(0);
    const delays = [0, 550, 1100, 1650];
    delays.forEach((d, i) => {
      setTimeout(() => setStepIndex(i), d);
    });
    setTimeout(() => {
      setRunning(false);
      onDetected(source);
    }, 2200);
  };

  return (
    <Card style={{ background: COLORS.forestDark, border: "none", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>Automatic Expense Detection</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: "rgba(169,226,76,0.15)",
            color: COLORS.lime, padding: "5px 11px", borderRadius: 999, fontWeight: 600,
          }}>
            <Radio size={11} /> Automatic tracking active
          </span>
          <button onClick={runDetection} disabled={running} style={{
            display: "flex", alignItems: "center", gap: 6, border: "none", cursor: running ? "default" : "pointer",
            background: COLORS.lime, color: COLORS.forestDark, borderRadius: 9, padding: "8px 13px",
            fontSize: 12.5, fontWeight: 700, opacity: running ? 0.7 : 1,
          }}>
            <Sparkles size={13} /> {running ? "Detecting…" : "Detect next transaction"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, overflowX: "auto" }}>
        {steps.map((step, i, arr) => {
          const label = i === 0 && lastTxn ? `${money(Math.abs(lastTxn.amount))} · ${lastTxn.merchant}` : step;
          const isActive = i <= stepIndex;
          return (
            <React.Fragment key={step}>
              <div style={{
                background: isActive ? "rgba(169,226,76,0.14)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${isActive ? "rgba(169,226,76,0.4)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 10, padding: "10px 14px", fontSize: 12.5, whiteSpace: "nowrap", fontWeight: 600,
                color: isActive ? COLORS.lime : "#EAF0E9", transition: "all .25s ease",
              }}>
                {step === "Auto-categorized" && stepIndex >= 2 && lastTxn ? `Categorized · ${lastTxn.cat}` : label}
              </div>
              {i < arr.length - 1 && <ArrowRight size={15} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />}
            </React.Fragment>
          );
        })}
      </div>
      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", margin: "14px 0 0" }}>
        New transactions from linked accounts are picked up, categorized, and reflected in your budgets automatically — no manual entry needed.
      </p>
    </Card>
  );
}

function DashboardScreen({ onAdd, transactions, onAutoDetected, onUpload, uploading, importBanner, onNav, user, onDelete }) {
  // Derive real numbers from this user's transactions instead of showing
  // fixed placeholder figures for everyone.
  const incomeFromTxns = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Monthly Income and Available Budget are targets the user sets in Settings.
  // Until they're set (or as a sensible default), fall back to what the
  // transaction history actually shows.
  const hasIncomeTarget = (user?.monthly_income ?? 0) > 0;
  const hasBudgetTarget = (user?.monthly_budget ?? 0) > 0;
  const monthlyIncome = hasIncomeTarget ? user.monthly_income : incomeFromTxns;
  const availableBudget = hasBudgetTarget
    ? Math.max(user.monthly_budget - totalExpenses, 0)
    : Math.max(monthlyIncome - totalExpenses, 0);
  const totalBalance = monthlyIncome - totalExpenses;
  const savingsPct = monthlyIncome > 0 ? Math.round(Math.max(Math.min((totalBalance / monthlyIncome) * 100, 100), 0)) : 0;
  const firstName = (user?.name || "there").split(" ")[0];

  // Real month-by-month spend, built from txn_date where we have one
  // (manual entries with a date, or CSV imports — both formats handled by
  // parseFlexibleDate). A transaction with no date at all is assumed to
  // belong to the most recent month that actually has data (the anchor —
  // consistent with the Analytics screen's chart), not necessarily today's
  // real-world month, so imported historical statements still land inside
  // the visible range. Sorted chronologically.
  const anchorDash = latestTransactionDate(transactions);
  const monthlySpend = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    const d = parseFlexibleDate(t.when) || anchorDash;
    const label = d.toLocaleString("en-US", { month: "short" });
    const sortKey = d.getFullYear() * 12 + d.getMonth();
    if (!monthlySpend[label]) monthlySpend[label] = { amount: 0, sortKey };
    monthlySpend[label].amount += Math.abs(t.amount);
  });
  const spendChartData = Object.entries(monthlySpend)
    .sort((a, b) => a[1].sortKey - b[1].sortKey)
    .map(([month, v]) => ({ month, amount: v.amount }));

  // Per-category spend, from real transactions only — no fake ₹ limits,
  // since there's no per-category budget feature yet.
  const categorySpend = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    categorySpend[t.cat] = (categorySpend[t.cat] || 0) + Math.abs(t.amount);
  });
  const categoryTotals = Object.entries(categorySpend)
    .map(([name, spent]) => ({ name, spent }))
    .sort((a, b) => b.spent - a.spent);
  const maxCategorySpend = Math.max(...categoryTotals.map((c) => c.spent), 1);

  return (
    <>
      <Header title={`Good evening, ${firstName} 👋`} subtitle="Here's your financial overview for August 2026." onAdd={onAdd} onUpload={onUpload} uploading={uploading} onNav={onNav} transactions={transactions} user={user} />
      {importBanner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: COLORS.greenBg, color: COLORS.green,
          fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 10, marginBottom: 16,
        }}>
          <CheckCircle2 size={16} /> {importBanner}
        </div>
      )}

      {/* hero + summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{
          gridColumn: "span 2", background: `linear-gradient(135deg, ${COLORS.forestDark}, ${COLORS.forest})`,
          borderRadius: 18, padding: 24, color: "#fff", position: "relative", overflow: "hidden",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <svg style={{ position: "absolute", right: -10, bottom: -20, opacity: 0.15 }} width="150" height="150" viewBox="0 0 150 150">
            <circle cx="75" cy="75" r="60" fill="none" stroke={COLORS.lime} strokeWidth="2" />
            <circle cx="100" cy="45" r="26" fill="none" stroke={COLORS.lime} strokeWidth="2" />
          </svg>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 13, color: "#B7C7BB", marginBottom: 6 }}>Total Balance</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
              {money(totalBalance)}
            </div>
            <div style={{ marginTop: 10 }}>
              {transactions.length > 0 ? (
                <Pill tone={totalBalance >= 0 ? "lime" : "red"}>
                  {totalBalance >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} based on your transactions
                </Pill>
              ) : (
                <Pill tone="slate">No transactions yet</Pill>
              )}
            </div>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <SavingsRing pct={savingsPct} />
          </div>
        </div>

        {[
          { label: "Monthly Income", value: monthlyIncome, sub: transactions.length ? "from your transactions" : "Add income to see this" },
          { label: "Total Expenses", value: totalExpenses, sub: transactions.length ? "from your transactions" : "Add expenses to see this" },
          { label: "Available Budget", value: availableBudget, sub: `${money(availableBudget)} remaining` },
        ].map((s) => (
          <Card key={s.label}>
            <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: COLORS.ink }}>
              {money(s.value)}
            </div>
            <div style={{ marginTop: 8 }}>
              {s.up === undefined ? (
                <span style={{ fontSize: 12, color: COLORS.slate }}>{s.sub}</span>
              ) : (
                <Pill tone={s.up ? "green" : "red"}>
                  {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {s.sub}
                </Pill>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* savings rate standalone small card row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", marginBottom: 16 }}>
        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconBadge icon={Target} tone="lime" size={30} />
            <span style={{ fontSize: 13.5, color: COLORS.ink, fontWeight: 600 }}>Savings Rate</span>
          </div>
          <Pill tone="lime">{savingsPct}% {savingsPct >= 30 ? "· Great progress" : savingsPct > 0 ? "· Keep going" : ""}</Pill>
        </Card>
      </div>

      {/* spending + budget */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Spending Overview</h3>
            <div style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: COLORS.slate,
              border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 10px",
            }}>
              Last 6 months <ChevronDown size={13} />
            </div>
          </div>
          {spendChartData.length === 0 ? (
            <div style={{
              height: 190, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", color: COLORS.slate, textAlign: "center", gap: 6,
            }}>
              <BarChart3 size={26} color={COLORS.border} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>No spending yet</div>
              <div style={{ fontSize: 12 }}>Add an expense or upload a statement to see this chart.</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={spendChartData} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke={COLORS.border} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: COLORS.slate }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.slate }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {spendChartData.map((d, i) => (
                    <Cell key={i} fill={i === spendChartData.length - 1 ? COLORS.lime : COLORS.forestMid} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Spending by Category</h3>
          {categoryTotals.length === 0 ? (
            <div style={{ color: COLORS.slate, fontSize: 12.5, padding: "20px 0", textAlign: "center" }}>
              No expenses yet — categories will appear here once you add some.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {categoryTotals.map((b) => {
                const pct = Math.round((b.spent / maxCategorySpend) * 100);
                return (
                  <div key={b.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, color: COLORS.ink }}>{b.name}</span>
                      <span style={{ color: COLORS.slate, fontFamily: "'JetBrains Mono', monospace" }}>
                        {money(b.spent)}
                      </span>
                    </div>
                    <ProgressBar pct={pct} tone="green" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* transactions + insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Recent Transactions</h3>
            <button style={{ fontSize: 12.5, color: COLORS.forest, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              View All
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: `1px solid ${COLORS.border}`,
                background: t.justAdded ? COLORS.limeSoft : "transparent", borderRadius: t.justAdded ? 8 : 0,
                transition: "background 1s ease",
              }}>
                <IconBadge icon={t.icon} tone={t.tone === "lime" ? "lime" : t.tone === "red" ? "red" : t.tone === "amber" ? "amber" : "forest"} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.slate }}>{t.when} · {t.cat}</div>
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: 700,
                  color: t.amount > 0 ? COLORS.green : COLORS.ink,
                }}>
                  {t.amount > 0 ? "+" : "−"}{money(Math.abs(t.amount))}
                </div>
                <button
                  onClick={() => onDelete(t.id)}
                  title="Delete transaction"
                  style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex", color: COLORS.slate }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink, display: "flex", alignItems: "center", gap: 6 }}>
            Smart Insights <Sparkles size={15} color={COLORS.lime} />
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: AlertTriangle, tone: "amber", title: "Shopping Budget Alert", body: "You've used 95% of your shopping budget with 10 days remaining." },
              { icon: TrendingUp, tone: "red", title: "Spending Trend", body: "Your food spending is 18% higher than last month." },
              { icon: Target, tone: "lime", title: "Savings Opportunity", body: "Reducing daily spending by ₹150 could help you save an extra ₹4,500 this month." },
            ].map((ins) => (
              <div key={ins.title} style={{ display: "flex", gap: 10, padding: 12, borderRadius: 12, background: COLORS.cream }}>
                <IconBadge icon={ins.icon} tone={ins.tone} size={30} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink }}>{ins.title}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.slate, marginTop: 2, lineHeight: 1.4 }}>{ins.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* automatic expense detection */}
      <AutoDetectionCard onDetected={onAutoDetected} />
    </>
  );
}

/* ---------------- Transactions screen ---------------- */

function TransactionsScreen({ onAdd, transactions, onUpload, uploading, importBanner, onNav, onDelete, user }) {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? transactions : tab === "income" ? transactions.filter(r => r.amount > 0) : transactions.filter(r => r.amount < 0);

  return (
    <>
      <Header title="Transactions" subtitle="Every rupee, tracked and categorized automatically." onAdd={onAdd} onUpload={onUpload} uploading={uploading} onNav={onNav} transactions={transactions} user={user} />
      {importBanner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: COLORS.greenBg, color: COLORS.green,
          fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: 10, marginBottom: 16,
        }}>
          <CheckCircle2 size={16} /> {importBanner}
        </div>
      )}
      <Card>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 12px", flex: 1, minWidth: 180 }}>
            <Search size={14} color={COLORS.slate} />
            <input placeholder="Search transactions" style={{ border: "none", outline: "none", fontSize: 13, width: "100%" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, color: COLORS.slate }}>
            All categories <ChevronDown size={13} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, color: COLORS.slate }}>
            <Calendar size={13} /> August 2026 <ChevronDown size={13} />
          </div>
          <div style={{ display: "flex", background: COLORS.cream, borderRadius: 10, padding: 3 }}>
            {[["all", "All"], ["income", "Income"], ["expense", "Expense"]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                border: "none", borderRadius: 8, padding: "7px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: tab === k ? COLORS.white : "transparent", color: tab === k ? COLORS.forest : COLORS.slate,
              }}>{label}</button>
            ))}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: COLORS.slate, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4 }}>
              <th style={{ padding: "8px 10px", fontWeight: 600 }}>Description</th>
              <th style={{ padding: "8px 10px", fontWeight: 600 }}>Category</th>
              <th style={{ padding: "8px 10px", fontWeight: 600 }}>Date</th>
              <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Amount</th>
              <th style={{ padding: "8px 10px", fontWeight: 600, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "28px 10px", textAlign: "center", color: COLORS.slate, fontSize: 13 }}>
                  No transactions yet — add an expense or upload a statement to get started.
                </td>
              </tr>
            ) : filtered.map((t) => (
              <tr key={t.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "12px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <IconBadge icon={t.icon} tone={t.tone === "lime" ? "lime" : t.tone === "red" ? "red" : t.tone === "amber" ? "amber" : "forest"} size={30} />
                    <span style={{ fontWeight: 600, color: COLORS.ink }}>{t.name}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 10px", color: COLORS.slate }}>{t.cat}</td>
                <td style={{ padding: "12px 10px", color: COLORS.slate }}>{t.when}</td>
                <td style={{
                  padding: "12px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700, color: t.amount > 0 ? COLORS.green : COLORS.ink,
                }}>
                  {t.amount > 0 ? "+" : "−"}{money(Math.abs(t.amount))}
                </td>
                <td style={{ padding: "12px 10px", textAlign: "center" }}>
                  <button
                    onClick={() => onDelete(t.id)}
                    title="Delete transaction"
                    style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex", color: COLORS.slate }}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

/* ---------------- Budgets screen ---------------- */

function BudgetsScreen({ onAdd, onNav, transactions, user }) {
  const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const hasBudgetTarget = (user?.monthly_budget ?? 0) > 0;
  const monthlyBudget = hasBudgetTarget ? user.monthly_budget : null;

  const categorySpend = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    categorySpend[t.cat] = (categorySpend[t.cat] || 0) + Math.abs(t.amount);
  });
  const categoryTotals = Object.entries(categorySpend)
    .map(([name, spent]) => ({ name, spent }))
    .sort((a, b) => b.spent - a.spent);

  return (
    <>
      <Header title="Budgets" subtitle="Set limits, track progress, avoid surprises." onAdd={onAdd} onNav={onNav} transactions={transactions} user={user} />
      <Card style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12.5, color: COLORS.slate }}>Monthly Budget</div>
          {monthlyBudget === null ? (
            <div style={{ fontSize: 13, color: COLORS.slate, marginTop: 4 }}>
              Not set — add one in <strong>Settings</strong>.
            </div>
          ) : (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{money(monthlyBudget)}</div>
          )}
        </div>
        {monthlyBudget !== null && <ProgressBarWide spent={totalExpenses} total={monthlyBudget} />}
      </Card>

      {categoryTotals.length === 0 ? (
        <Card style={{ textAlign: "center", color: COLORS.slate, padding: "32px 20px" }}>
          No expenses yet — add some to see per-category spending here.
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {categoryTotals.map((b) => (
            <Card key={b.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink }}>{b.name}</div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: COLORS.ink }}>
                {money(b.spent)}
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.slate, marginTop: 4 }}>spent this period</div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ProgressBarWide({ spent, total }) {
  const pct = Math.round((spent / total) * 100);
  return (
    <div style={{ width: 220 }}>
      <ProgressBar pct={pct} tone={statusTone(spent, total)} />
      <div style={{ textAlign: "right", fontSize: 11.5, color: COLORS.slate, marginTop: 4 }}>{pct}% used</div>
    </div>
  );
}

/* ---------------- Analytics screen ---------------- */

function AnalyticsScreen({ onAdd, onNav, transactions, user }) {
  const CATEGORY_COLORS = {
    Food: COLORS.lime, Transport: COLORS.forestMid, Shopping: COLORS.amber,
    Entertainment: COLORS.red, Income: COLORS.green, Other: "#B9C4B4",
  };

  const categorySpend = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    categorySpend[t.cat] = (categorySpend[t.cat] || 0) + Math.abs(t.amount);
  });
  const pieData = Object.entries(categorySpend).map(([name, value]) => ({
    name, value, color: CATEGORY_COLORS[name] || "#B9C4B4",
  }));
  const categoryTotals = [...pieData].sort((a, b) => b.value - a.value);
  const maxCategorySpend = Math.max(...categoryTotals.map((c) => c.value), 1);

  // Expenses come from real transactions, grouped by month (parseFlexibleDate
  // handles both the date-picker's ISO format and bank-statement CSVs'
  // DD/MM/YYYY format correctly). A transaction with no date at all (added
  // without picking one — stored as "Saved") is assumed to belong to the
  // most recent month that actually has data, rather than being silently
  // dropped from the chart.
  const anchorDate = latestTransactionDate(transactions);
  const currentMonthKey = `${anchorDate.getFullYear()}-${anchorDate.getMonth()}`;
  const expenseByMonth = {};
  transactions.filter((t) => t.amount < 0).forEach((t) => {
    const d = parseFlexibleDate(t.when);
    const key = d ? `${d.getFullYear()}-${d.getMonth()}` : currentMonthKey;
    expenseByMonth[key] = (expenseByMonth[key] || 0) + Math.abs(t.amount);
  });

  // Income, by contrast, uses the recurring Monthly Income target from
  // Settings for every month shown — the same figure the Dashboard's
  // "Monthly Income" card already displays — rather than only appearing in
  // whichever single month you happened to log a matching transaction.
  // Falls back to real logged income per month if no target is set.
  const hasIncomeTargetChart = (user?.monthly_income ?? 0) > 0;
  const incomeByMonth = {};
  if (!hasIncomeTargetChart) {
    transactions.filter((t) => t.amount > 0).forEach((t) => {
      const d = parseFlexibleDate(t.when);
      const key = d ? `${d.getFullYear()}-${d.getMonth()}` : currentMonthKey;
      incomeByMonth[key] = (incomeByMonth[key] || 0) + t.amount;
    });
  }

  // Always show the 6 calendar months ending at the anchor month, so the
  // recurring income target has somewhere to appear even in months with
  // no logged transactions at all.
  const incomeExpense = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return {
      month: d.toLocaleString("en-US", { month: "short" }),
      income: hasIncomeTargetChart ? user.monthly_income : (incomeByMonth[key] || 0),
      expense: expenseByMonth[key] || 0,
    };
  });

  return (
    <>
      <Header title="Analytics" subtitle="Understand where your money goes." onAdd={onAdd} onNav={onNav} transactions={transactions} user={user} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Income vs Expenses</h3>
          {incomeExpense.length === 0 ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.slate, fontSize: 13 }}>
              No transactions yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={incomeExpense}>
                <CartesianGrid vertical={false} stroke={COLORS.border} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: COLORS.slate }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.slate }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 12 }} />
                <Line type="monotone" dataKey="income" stroke={COLORS.forestMid} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" stroke={COLORS.lime} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Category Breakdown</h3>
          {pieData.length === 0 ? (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.slate, fontSize: 13 }}>
              No expenses yet.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: COLORS.slate }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: "0 0 14px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Top Spending Categories</h3>
        {categoryTotals.length === 0 ? (
          <div style={{ color: COLORS.slate, fontSize: 13, padding: "12px 0" }}>No expenses yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categoryTotals.map((b, i) => (
              <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.slate, width: 16 }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink, width: 130 }}>{b.name}</span>
                <div style={{ flex: 1 }}><ProgressBar pct={(b.value / maxCategorySpend) * 100} tone="green" /></div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: COLORS.ink, width: 90, textAlign: "right" }}>{money(b.value)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* ---------------- Reports screen ---------------- */

function ReportsScreen({ onAdd, onNav, transactions, user }) {
  const incomeTxns = transactions.filter((t) => t.amount > 0);
  const expenseTxns = transactions.filter((t) => t.amount < 0);
  const totalIncome = incomeTxns.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const incomeSourceCount = new Set(incomeTxns.map((t) => t.name)).size;
  const expenseCategoryCount = new Set(expenseTxns.map((t) => t.cat)).size;
  const monthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  const downloadCsv = () => {
    if (transactions.length === 0) return;
    const rows = transactions.map((t) => ({
      name: t.name, category: t.cat, date: t.when, amount: t.amount,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartbudget-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header title="Reports" subtitle="Export summaries for your records." onAdd={onAdd} onNav={onNav} transactions={transactions} user={user} />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink }}>Monthly report — {monthName}</div>
            <div style={{ fontSize: 12.5, color: COLORS.slate, marginTop: 3 }}>Full breakdown of income, expenses and budget performance.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={downloadCsv}
              disabled={transactions.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.border}`, background: COLORS.white,
                borderRadius: 9, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, color: COLORS.ink,
                cursor: transactions.length === 0 ? "default" : "pointer", opacity: transactions.length === 0 ? 0.5 : 1,
              }}
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 6 }}>Income summary</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{money(totalIncome)}</div>
          <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 6 }}>
            {incomeTxns.length === 0 ? "No income recorded yet" : `${incomeSourceCount} source${incomeSourceCount !== 1 ? "s" : ""} this month`}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 6 }}>Expense summary</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: COLORS.ink }}>{money(totalExpenses)}</div>
          <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 6 }}>
            {expenseTxns.length === 0 ? "No expenses recorded yet" : `Across ${expenseCategoryCount} tracked categor${expenseCategoryCount !== 1 ? "ies" : "y"}`}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Savings Goals screen ---------------- */

function GoalsScreen({ onAdd, onNav, goals, onNewGoal, onDeleteGoal, transactions, user }) {
  return (
    <>
      <Header title="Savings Goals" subtitle="Track progress toward what matters." onAdd={onAdd} onNav={onNav} transactions={transactions} user={user} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {goals.map((g) => {
          const pct = Math.round((g.current / g.target) * 100);
          return (
            <Card key={g.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.slate, marginTop: 2 }}>
                    {g.deadline ? `Target by ${g.deadline}` : "No target date set"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Pill tone="lime">{pct}%</Pill>
                  <button
                    onClick={() => onDeleteGoal(g.id)}
                    title="Delete goal"
                    style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex", color: COLORS.slate }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <ProgressBar pct={Math.min(pct, 100)} tone="green" />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", color: COLORS.ink }}>
                <span>{money(g.current)}</span>
                <span style={{ color: COLORS.slate }}>of {money(g.target)}</span>
              </div>
            </Card>
          );
        })}
        <Card
          onClick={onNewGoal}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px dashed ${COLORS.border}`, color: COLORS.slate, cursor: "pointer" }}
        >
          <Plus size={22} />
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>New savings goal</div>
        </Card>
      </div>
    </>
  );
}

function AddGoalModal({ onClose, onSave, saving, error }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSave = () => {
    if (!name.trim() || !target.trim()) {
      setLocalError("Goal name and target amount are required.");
      return;
    }
    if (Number.isNaN(parseFloat(target)) || parseFloat(target) <= 0) {
      setLocalError("Target must be a positive number.");
      return;
    }
    if (current.trim() && Number.isNaN(parseFloat(current))) {
      setLocalError("Current amount must be a number.");
      return;
    }
    setLocalError("");
    onSave({ name: name.trim(), target, current: current || 0, deadline });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(11,32,24,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLORS.white, borderRadius: 18, padding: 24, width: 380,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: COLORS.ink }}>New savings goal</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <X size={18} color={COLORS.slate} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Goal name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Target amount (₹)</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" inputMode="decimal" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Already saved (₹)</label>
            <input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0.00" inputMode="decimal" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Target date</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} />
          </div>

          {(localError || error) && (
            <div style={{ fontSize: 12.5, color: COLORS.red, background: COLORS.redBg, borderRadius: 8, padding: "8px 12px" }}>
              {localError || error}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, border: `1px solid ${COLORS.border}`, background: COLORS.white, borderRadius: 10,
            padding: "10px 0", fontSize: 13.5, fontWeight: 600, color: COLORS.ink, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, border: "none", background: COLORS.lime, borderRadius: 10,
            padding: "10px 0", fontSize: 13.5, fontWeight: 700, color: COLORS.forestDark,
            cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
          }}>{saving ? "Saving…" : "Save goal"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Settings screen ---------------- */

function SettingsScreen({ user, onLogout, onUpdateSettings, settingsSaving, settingsError, transactions }) {
  const initials = (user?.name || "Aniket Sen")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthly_income ?? 0);
  const [monthlyBudget, setMonthlyBudget] = useState(user?.monthly_budget ?? 0);
  const [saved, setSaved] = useState(false);
  const [localError, setLocalError] = useState("");
  const wasSaving = React.useRef(false);

  const handleSave = () => {
    const income = parseFloat(monthlyIncome);
    const budget = parseFloat(monthlyBudget);
    if (Number.isNaN(income) || Number.isNaN(budget) || income < 0 || budget < 0) {
      setLocalError("Enter valid non-negative numbers for both fields.");
      return;
    }
    setLocalError("");
    setSaved(false);
    onUpdateSettings({ monthlyIncome: income, monthlyBudget: budget });
  };

  // Only flip to "Saved" on the true→false transition of settingsSaving
  // (i.e. right after a save actually completed), not on initial mount.
  useEffect(() => {
    if (wasSaving.current && !settingsSaving && !settingsError) setSaved(true);
    wasSaving.current = settingsSaving;
  }, [settingsSaving, settingsError]);

  const inputStyle = {
    width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 10,
    padding: "10px 12px", fontSize: 13.5, fontFamily: "'JetBrains Mono', monospace",
    color: COLORS.ink, outline: "none",
  };

  return (
    <>
      <Header title="Settings" subtitle="Manage your SmartBudget account and preferences." transactions={transactions} user={user} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, maxWidth: 760 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>
            Account
          </h3>

          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: 14,
            background: COLORS.cream, borderRadius: 12, marginBottom: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: COLORS.forest,
              color: COLORS.lime, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{user?.name || "Aniket Sen"}</div>
              <div style={{ fontSize: 12, color: COLORS.slate, marginTop: 3 }}>{user?.email || "Personal Account"}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0", borderBottom: `1px solid ${COLORS.border}`,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>Automatic transaction tracking</div>
                <div style={{ fontSize: 11.5, color: COLORS.slate, marginTop: 3 }}>Automatically categorize detected transactions.</div>
              </div>
              <Pill tone="lime">Active</Pill>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>Currency</div>
                <div style={{ fontSize: 11.5, color: COLORS.slate, marginTop: 3 }}>Indian Rupee (₹)</div>
              </div>
              <Pill tone="slate">INR</Pill>
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 6px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Budget</h3>
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: COLORS.slate }}>
            Set your expected monthly income and spending limit — these drive the numbers on your Dashboard.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>
                Monthly Income (₹)
              </label>
              <input
                type="number" min="0" value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>
                Available Budget (₹)
              </label>
              <input
                type="number" min="0" value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {(localError || settingsError) && (
            <div style={{ fontSize: 12.5, color: COLORS.red, marginBottom: 12 }}>
              {localError || settingsError}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={settingsSaving}
              style={{
                border: "none", background: COLORS.forestDark, color: "#fff", borderRadius: 10,
                padding: "10px 18px", fontSize: 13.5, fontWeight: 700,
                cursor: settingsSaving ? "default" : "pointer", opacity: settingsSaving ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              {settingsSaving && <Loader2 size={14} className="spin" />}
              {settingsSaving ? "Saving..." : "Save budget"}
            </button>
            {saved && !settingsSaving && !localError && !settingsError && (
              <span style={{ fontSize: 12.5, color: COLORS.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 8px", fontSize: 15.5, fontWeight: 700, color: COLORS.ink }}>Account actions</h3>
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: COLORS.slate }}>
            Logging out will return you to the login screen.
          </p>
          <button
            onClick={onLogout}
            style={{
              border: "none", background: COLORS.red, color: COLORS.white, borderRadius: 10,
              padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            Log out
          </button>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Add Expense modal ---------------- */

const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Income", "Other"];

function AddExpenseModal({ onClose, onSave, saving, error }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSave = () => {
    if (!name.trim() || !amount.trim() || !category) {
      setLocalError("Expense name, amount and category are required.");
      return;
    }
    if (Number.isNaN(parseFloat(amount))) {
      setLocalError("Amount must be a number.");
      return;
    }
    setLocalError("");
    onSave({ name: name.trim(), amount, category, date, paymentMethod, notes });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(11,32,24,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLORS.white, borderRadius: 18, padding: 24, width: 380,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, color: COLORS.ink }}>Add expense</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}>
            <X size={18} color={COLORS.slate} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Expense name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grocery run"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Amount (₹)</label>
            <input
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              <option value="">Select a category</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Date</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Payment method</label>
            <input
              value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="UPI, card, cash..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={2}
              style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
            />
          </div>

          {(localError || error) && (
            <div style={{ fontSize: 12.5, color: COLORS.red, background: COLORS.redBg, borderRadius: 8, padding: "8px 12px" }}>
              {localError || error}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, border: `1px solid ${COLORS.border}`, background: COLORS.white, borderRadius: 10,
            padding: "10px 0", fontSize: 13.5, fontWeight: 600, color: COLORS.ink, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, border: "none", background: COLORS.lime, borderRadius: 10,
            padding: "10px 0", fontSize: 13.5, fontWeight: 700, color: COLORS.forestDark,
            cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
          }}>{saving ? "Saving…" : "Save expense"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Login screen ---------------- */

function LoginScreen({ onLogin, theme, toggleTheme }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:5001/api";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError("Fill in all fields to continue.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? "signup" : "login";
      const body = mode === "signup" ? { name, email, password } : { email, password };

      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setLoading(false);
        return;
      }

      onLogin(data.user);
    } catch (err) {
      setError("Couldn't reach the server. Is the backend running on port 5001?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: COLORS.forestDark, fontFamily: "'Inter', sans-serif", padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        .sb-input:focus { border-color: ${COLORS.lime} !important; box-shadow: 0 0 0 3px rgba(169,226,76,0.15); }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 920, background: COLORS.white, borderRadius: 20, overflow: "hidden",
        display: "flex", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", position: "relative",
      }}>
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            position: "absolute", top: 14, right: 14, zIndex: 5, width: 34, height: 34, borderRadius: 9,
            border: `1px solid ${COLORS.border}`, background: COLORS.cream, display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          {theme === "dark" ? <Sun size={15} color={COLORS.ink} /> : <Moon size={15} color={COLORS.ink} />}
        </button>
        {/* left brand panel */}
        <div style={{
          flex: "0 0 42%", background: `linear-gradient(160deg, ${COLORS.forestDark}, ${COLORS.forest})`,
          padding: 40, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between",
          position: "relative", overflow: "hidden",
        }}>
          <svg style={{ position: "absolute", right: -30, bottom: -30, opacity: 0.12 }} width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="90" fill="none" stroke={COLORS.lime} strokeWidth="2" />
            <circle cx="150" cy="60" r="38" fill="none" stroke={COLORS.lime} strokeWidth="2" />
          </svg>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, background: COLORS.lime,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Coins size={18} color={COLORS.forestDark} />
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18 }}>SmartBudget</span>
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 600, lineHeight: 1.3, margin: "0 0 12px" }}>
              Track every rupee, automatically.
            </h2>
            <p style={{ fontSize: 13.5, color: "#B7C7BB", lineHeight: 1.6, margin: 0 }}>
              Link a statement once and let SmartBudget categorize spending, track budgets, and surface insights for you.
            </p>
          </div>
          <div style={{ position: "relative", zIndex: 1, fontSize: 12, color: "#8AA091" }}>
            Built for the SmartBudget SE project
          </div>
        </div>

        {/* right form panel */}
        <div style={{ flex: 1, padding: "44px 44px" }}>
          <div style={{ display: "flex", background: COLORS.cream, borderRadius: 10, padding: 3, marginBottom: 28, width: 220 }}>
            {[["login", "Log in"], ["signup", "Sign up"]].map(([k, label]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} style={{
                flex: 1, border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: mode === k ? COLORS.white : "transparent", color: mode === k ? COLORS.forest : COLORS.slate,
              }}>{label}</button>
            ))}
          </div>

          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 21, fontWeight: 600, margin: "0 0 6px", color: COLORS.ink }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h3>
          <p style={{ fontSize: 13, color: COLORS.slate, margin: "0 0 24px" }}>
            {mode === "login" ? "Log in to see your financial overview." : "Set up SmartBudget in under a minute."}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Full name</label>
                <input
                  className="sb-input" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Aniket Sen" style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Email</label>
              <input
                className="sb-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, marginBottom: 5, display: "block" }}>Password</label>
              <input
                className="sb-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ fontSize: 12.5, color: COLORS.red, background: COLORS.redBg, borderRadius: 8, padding: "8px 12px" }}>
                {error}
              </div>
            )}

            {mode === "login" && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 12, color: COLORS.forest, fontWeight: 600, cursor: "pointer" }}>Forgot password?</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              border: "none", background: COLORS.lime, color: COLORS.forestDark, borderRadius: 10,
              padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              marginTop: 6, opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p style={{ fontSize: 11.5, color: COLORS.slate, textAlign: "center", marginTop: 22 }}>
            By continuing you agree to SmartBudget's Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: `1px solid ${COLORS.border}`, borderRadius: 9,
  padding: "10px 12px", fontSize: 13.5, outline: "none", transition: "border-color .15s ease",
};



export default function SmartBudgetApp() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);

  // ---- Theme (dark/light) ----
  // Persisted in localStorage so it survives a refresh; falls back to the
  // OS-level preference the first time someone opens the app.
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem("sb-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  // Reassigning the module-level COLORS binding here, before any JSX below
  // is evaluated, means every component's COLORS.xxx lookups during this
  // render pass see the right palette — including the Login screen.
  COLORS = theme === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("sb-theme", next);
      return next;
    });
  };

  // New sessions start with zero transactions — real data is loaded per-user
  // from the backend below (or added manually / via statement upload).
  const [transactions, setTransactions] = useState([]);
  const [nextId, setNextId] = useState(100);
  const [uploading, setUploading] = useState(false);
  const [importBanner, setImportBanner] = useState(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState("");

  const API_BASE = "http://localhost:5001/api";

  const iconForCategory = (cat) => {
    const rule = CATEGORY_RULES.find((r) => r.cat === cat);
    return rule ? { icon: rule.icon, tone: rule.tone } : { icon: ShoppingBag, tone: "forest" };
  };

  // Load this user's previously saved manual expenses from the backend on login.
  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/transactions/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.transactions) return;
        const loaded = data.transactions.map((row) => {
          const { icon, tone } = iconForCategory(row.category);
          return {
            id: `db-${row.id}`,
            name: row.name,
            cat: row.category,
            when: row.txn_date || "Saved",
            amount: row.category === "Income" ? Math.abs(row.amount) : -Math.abs(row.amount),
            icon,
            tone,
            justAdded: false,
          };
        });
        setTransactions(loaded); // replace, don't merge — this is this user's full history
      })
      .catch(() => {
        // Backend not reachable — dashboard still works with demo/local data.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAddExpense = ({ name, amount, category, date, paymentMethod, notes }) => {
    setSavingExpense(true);
    setExpenseError("");

    fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        name,
        category,
        amount: category === "Income" ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount)),
        date,
        payment_method: paymentMethod,
        notes,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't save that expense.");
        const { icon, tone } = iconForCategory(category);
        const txn = {
          id: `db-${data.transaction.id}`,
          name: data.transaction.name,
          cat: data.transaction.category,
          when: data.transaction.txn_date || "Just now",
          amount: data.transaction.amount,
          icon,
          tone,
          justAdded: true,
        };
        setTransactions((prev) => [txn, ...prev.map((p) => ({ ...p, justAdded: false }))]);
        setSavingExpense(false);
        setShowModal(false);
        setTimeout(() => {
          setTransactions((prev) => prev.map((p) => (p.id === txn.id ? { ...p, justAdded: false } : p)));
        }, 2500);
      })
      .catch((err) => {
        setSavingExpense(false);
        setExpenseError(err.message || "Couldn't reach the server. Is the backend running on port 5001?");
      });
  };

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  // Saves the user's monthly income / budget target and updates local state
  // (including localStorage-free session state — no refresh needed).
  const handleUpdateSettings = ({ monthlyIncome, monthlyBudget }) => {
    setSettingsSaving(true);
    setSettingsError("");
    fetch(`${API_BASE}/users/${user.id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthly_income: monthlyIncome, monthly_budget: monthlyBudget }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't save your settings.");
        setUser(data.user);
        setSettingsSaving(false);
      })
      .catch((err) => {
        setSettingsSaving(false);
        setSettingsError(err.message || "Couldn't reach the server. Is the backend running on port 5001?");
      });
  };

  const handleAutoDetected = (source) => {
    const txn = {
      id: nextId,
      name: source.name,
      cat: source.cat,
      when: "Just now",
      amount: source.amount,
      icon: source.icon,
      tone: source.tone,
      justAdded: true,
    };
    setNextId((n) => n + 1);
    setTransactions((prev) => [txn, ...prev.map((p) => ({ ...p, justAdded: false }))]);
    setTimeout(() => {
      setTransactions((prev) => prev.map((p) => (p.id === txn.id ? { ...p, justAdded: false } : p)));
    }, 2500);
  };

  const handleStatementUpload = (file) => {
    setUploading(true);
    setImportBanner(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        let idCounter = nextId;
        const parsed = [];

        rows.forEach((row) => {
          const narration = row.Narration || row.narration || row.Description || row.description || "";
          const debit = parseFloat(row.Debit || row.debit || 0) || 0;
          const credit = parseFloat(row.Credit || row.credit || 0) || 0;
          const date = row.Date || row.date || "";
          if (!narration || (debit === 0 && credit === 0)) return;

          const amount = credit > 0 ? credit : -debit;
          const { cat, icon, tone } = categorizeNarration(narration);
          parsed.push({
            id: idCounter++,
            name: cleanMerchantName(narration),
            cat,
            when: date || "Imported",
            amount,
            icon,
            tone,
            justAdded: true,
          });
        });

        setNextId(idCounter);
        setTransactions((prev) => [...parsed.reverse(), ...prev.map((p) => ({ ...p, justAdded: false }))]);
        setUploading(false);
        setImportBanner(
          parsed.length > 0
            ? `Imported ${parsed.length} transaction${parsed.length === 1 ? "" : "s"} from statement and categorized them automatically.`
            : "No transactions found in that file — check the column headers match Date, Narration, Debit, Credit."
        );
        setTimeout(() => {
          setTransactions((prev) => prev.map((p) => ({ ...p, justAdded: false })));
        }, 3000);
        setTimeout(() => setImportBanner(null), 6000);
      },
      error: () => {
        setUploading(false);
        setImportBanner("Couldn't read that file. Make sure it's a CSV export.");
        setTimeout(() => setImportBanner(null), 6000);
      },
    });
  };



  // ---- Delete a transaction (works for both backend-saved rows and
  // locally-added ones from CSV import / auto-detect that were never sent
  // to the server) ----
  const handleDeleteTransaction = (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    const isPersisted = typeof id === "string" && id.startsWith("db-");
    if (!isPersisted) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      return;
    }
    const numericId = id.replace("db-", "");
    fetch(`${API_BASE}/transactions/${numericId}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Couldn't delete that transaction.");
        }
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      })
      .catch((err) => {
        window.alert(err.message || "Couldn't reach the server. Is the backend running on port 5001?");
      });
  };

  // ---- Savings goals: load, add, delete ----
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");

  useEffect(() => {
    if (!user) {
      setGoals([]);
      return;
    }
    fetch(`${API_BASE}/goals/${user.id}`)
      .then((res) => res.json())
      .then((data) => setGoals(data.goals || []))
      .catch(() => {
        // Backend not reachable — goals just won't load this session.
      });
  }, [user]);

  const handleAddGoal = ({ name, target, current, deadline }) => {
    setSavingGoal(true);
    setGoalError("");
    fetch(`${API_BASE}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, name, target, current, deadline }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't save that goal.");
        setGoals((prev) => [data.goal, ...prev]);
        setSavingGoal(false);
        setShowGoalModal(false);
      })
      .catch((err) => {
        setSavingGoal(false);
        setGoalError(err.message || "Couldn't reach the server. Is the backend running on port 5001?");
      });
  };

  const handleDeleteGoal = (id) => {
    if (!window.confirm("Delete this savings goal?")) return;
    fetch(`${API_BASE}/goals/${id}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Couldn't delete that goal.");
        }
        setGoals((prev) => prev.filter((g) => g.id !== id));
      })
      .catch((err) => {
        window.alert(err.message || "Couldn't reach the server. Is the backend running on port 5001?");
      });
  };

  const dashProps = {
    onAdd: () => setShowModal(true), transactions, onAutoDetected: handleAutoDetected,
    onUpload: handleStatementUpload, uploading, importBanner, onNav: setScreen, user, onDelete: handleDeleteTransaction,
  };
  const txnProps = {
    onAdd: () => setShowModal(true), transactions,
    onUpload: handleStatementUpload, uploading, importBanner, onNav: setScreen, onDelete: handleDeleteTransaction, user,
  };
  const defaultProps = { onAdd: () => setShowModal(true), onNav: setScreen };
  const dataProps = { onAdd: () => setShowModal(true), onNav: setScreen, transactions, user };
  const goalsProps = {
    onAdd: () => setShowModal(true), onNav: setScreen, goals,
    onNewGoal: () => setShowGoalModal(true), onDeleteGoal: handleDeleteGoal, transactions, user,
  };
  const settingsProps = {
    user,
    onLogout: () => {
      setUser(null);
      setTransactions([]); // clear so the next login (possibly a different user) starts fresh
    },
    onUpdateSettings: handleUpdateSettings,
    settingsSaving,
    settingsError,
    transactions,
  };

  const screenPropsMap = {
    dashboard: dashProps,
    transactions: txnProps,
    budgets: dataProps,
    analytics: dataProps,
    reports: dataProps,
    goals: goalsProps,
    settings: settingsProps,
  };

  const screens = {
    dashboard: DashboardScreen,
    transactions: TransactionsScreen,
    budgets: BudgetsScreen,
    analytics: AnalyticsScreen,
    reports: ReportsScreen,
    goals: GoalsScreen,
    settings: SettingsScreen,
  };
  const Screen = screens[screen];
  const screenProps = screenPropsMap[screen];

  if (!user) {
    return <LoginScreen onLogin={setUser} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div style={{
      display: "flex", height: "100vh", background: COLORS.cream,
      fontFamily: "'Inter', sans-serif", color: COLORS.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, textarea:focus { border-color: ${COLORS.forestMid} !important; }
        /* Visible keyboard focus for navigation and other interactive controls. */
        button:focus-visible, a:focus-visible, input:focus-visible,
        textarea:focus-visible, select:focus-visible {
          outline: 3px solid ${COLORS.lime};
          outline-offset: 3px;
        }
        table th, table td { text-align: left; }
        .spin { animation: sb-spin 0.9s linear infinite; }
        @keyframes sb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <Sidebar active={screen} onNav={setScreen} user={user} theme={theme} toggleTheme={toggleTheme} />
      <main id="main-content" style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <Screen {...screenProps} />
      </main>
      {showModal && (
        <AddExpenseModal
          onClose={() => { setShowModal(false); setExpenseError(""); }}
          onSave={handleAddExpense}
          saving={savingExpense}
          error={expenseError}
        />
      )}
      {showGoalModal && (
        <AddGoalModal
          onClose={() => { setShowGoalModal(false); setGoalError(""); }}
          onSave={handleAddGoal}
          saving={savingGoal}
          error={goalError}
        />
      )}
    </div>
  );
}