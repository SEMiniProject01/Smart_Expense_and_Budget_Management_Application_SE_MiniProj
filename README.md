# SmartBudget – Smart Expense & Budget Management Application

##  Project Information

**Project Name:** Smartbudget_MiniProject_SE  
**Project Type:** Software Engineering Mini Project  
**Class:** 5A  
**Domain:** Personal Finance Management  

---

##  Team Members

| Sl. No. | Name | SRN | Class |
|--------:|------|-----|-------|
| 1 | Aniket Sen | PES1UG24CS062 | 5A |
| 2 | Amrutha Kattimani | PES1UG24CS054 | 5A |
| 3 | Akanksha.P | PES1UG25CS801 | 5A |

---

##  Project Description

**SmartBudget** is a web-based Smart Expense & Budget Management Application designed to help users manage their personal finances.

The application allows users to record income and expenses, set monthly financial targets, monitor spending, import transactions from CSV bank statements, analyze spending patterns, manage savings goals, and generate transaction reports.

The system provides a simple dashboard with financial summaries, budget utilization, spending analytics, alerts, and personalized insights.

---

## Objectives

The main objectives of SmartBudget are:

- To provide an easy-to-use personal finance management system.
- To allow users to record and manage income and expenses.
- To help users set and monitor monthly budgets.
- To automatically categorize transactions imported from CSV statements.
- To provide visual analytics of spending patterns.
- To notify users when their spending approaches their budget.
- To help users track savings goals.
- To allow users to export transaction data as CSV reports.

---

##  Features

### User Account Management
- User registration
- User login
- User logout
- Password hashing using bcrypt
- User-specific financial data

###  Expense & Income Management
- Add income transactions
- Add expense transactions
- View transaction history
- Delete transactions
- Categorize transactions
- Add payment method and notes

###  Budget Management
- Set monthly income
- Set overall monthly budget
- Monitor budget utilization
- Display budget progress
- Generate budget alerts

###  Alerts & Insights
- Budget warning when spending reaches approximately 80%
- Over-budget notification when spending exceeds the budget
- Personalized spending insights
- Spending pattern analysis

###  CSV Statement Import
- Upload CSV bank statements
- Parse transaction data
- Detect debit and credit transactions
- Automatically categorize transactions
- Display imported transactions

###  Automatic Expense Detection
- Demonstration of automatic expense detection
- Simulated incoming transaction feed
- Automatic addition of detected transactions

> Note: The automatic expense detection feature is a demonstration and does not represent a live bank or UPI integration.

###  Analytics
- Income vs. expense analysis
- Category-wise expense breakdown
- Spending trends
- Top spending categories
- Interactive charts

###  Savings Goals
- Create savings goals
- Set target amounts
- Track current savings
- Add optional deadlines
- Delete savings goals

###  Reports
- View financial summaries
- Generate transaction reports
- Export transaction data as CSV

###  User Interface
- Responsive interface
- Light theme
- Dark theme
- Mobile-friendly layout

---

##  Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- Recharts
- Papa Parse
- Lucide React

### Backend

- Node.js
- Express.js
- JavaScript

### Database

- MongoDB
- Mongoose

### Security

- bcryptjs
- CORS

---

##  System Architecture

```text
              ┌──────────────────────┐
              │      User / Browser  │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   React Frontend     │
              │       + Vite         │
              └──────────┬───────────┘
                         │
                    REST API / JSON
                         │
                         ▼
              ┌──────────────────────┐
              │  Node.js + Express   │
              │      Backend         │
              └──────────┬───────────┘
                         │
                      Mongoose
                         │
                         ▼
              ┌──────────────────────┐
              │       MongoDB        │
              │      Database        │
              └──────────────────────┘
