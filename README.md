# SmartBudget

A full-stack expense & budget prototype for the DBMS/full-stack course project.

```
smartbudget/
├── frontend/     ← React + Vite dashboard (port 5173)
├── backend/      ← Express + SQLite auth API (port 5000)
└── sample_bank_statement.csv  ← test file for the "Upload statement" feature
```

You need **both** running at the same time, in two separate terminal windows.

## 1. Backend (start this first)

```bash
cd smartbudget/backend
npm install
npm start
```

You should see:
```
SmartBudget backend running at http://localhost:5000
```

This creates `smartbudget.db` (a SQLite file) right in the `backend` folder the first time it runs — that's your real database, with a `users` table (`id, name, email, password_hash, created_at`). Passwords are hashed with bcrypt.

Check it any time by visiting `http://localhost:5000/api/users` in a browser while the server is running.

## 2. Frontend

In a **second terminal window** (leave the backend running):

```bash
cd smartbudget/frontend
npm install
npm run dev
```

Open the URL it prints — usually `http://localhost:5173`.

## 3. Using it

- **Sign up** with a name, email, and a password (6+ characters) → creates a real row in the SQLite database via `POST /api/signup`.
- **Log out** (gear icon, bottom of the sidebar), then **log back in** with the same credentials → verified against the stored hash via `POST /api/login`.
- On the dashboard, click **Upload statement** and select `sample_bank_statement.csv` (one level up from `frontend/`) to see transactions get parsed and auto-categorized.
- Click **Detect next transaction** in the dark "Automatic Expense Detection" card to see the simulated live-detection flow.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Failed to resolve import" errors | You're not in the `frontend` folder, or forgot `npm install`. Run `pwd` to check where you are. |
| "Couldn't reach the server" on login/signup | The backend isn't running. Open a second terminal and follow step 1. |
| Port 5000 or 5173 already in use | Something else is using that port — close other running servers, or change the `PORT` value in `backend/server.js`. |

## For your project report

- **Schema**: `backend/db.js` has the `CREATE TABLE` statement. SQLite is used here for a zero-config demo — the same schema works in MySQL/PostgreSQL with minor syntax tweaks (`AUTOINCREMENT` → `AUTO_INCREMENT`, etc.).
- **Security**: passwords are never stored in plain text — see the `bcrypt.hash` / `bcrypt.compare` calls in `backend/server.js`.
