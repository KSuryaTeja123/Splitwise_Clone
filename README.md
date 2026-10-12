# Ledger — A Splitwise-style Expense Splitter (MERN)

A full-stack expense-splitting app: create groups, log shared expenses (equal / unequal / percentage splits), and settle up using a **greedy debt-simplification algorithm** that reduces N-way group debts to the minimum number of payments.

Built with **MongoDB, Express, React (Vite), Node.js**.

---

## Why this project

Most "Splitwise clone" tutorials stop at storing who-owes-whom per expense. This one goes a step further:

- **Derived balances, not stored balances** — a user's balance is *computed* from the full history of expenses + settlements on every request, rather than kept as a mutable field. This avoids balance-drift bugs (a common real-world bug class) at a small, acceptable compute cost.
- **Debt simplification algorithm** — a greedy min-cash-flow algorithm (`server/services/debtSimplifier.js`) matches the largest creditor against the largest debtor repeatedly, collapsing a group's tangled debts into at most `n - 1` transactions. It's unit-tested in isolation (`server/tests/debtSimplifier.test.js`) with no database dependency.
- **Three split types** — equal, unequal (exact amounts), and percentage-based splits, each validated server-side so the numbers always add up.

---

## Tech Stack

| Layer      | Tech |
|------------|------|
| Frontend   | React 18, Vite, React Router, Axios |
| Backend    | Node.js, Express |
| Database   | MongoDB + Mongoose |
| Auth       | JWT + bcrypt |
| Testing    | Jest |

---

## Project Structure

```
splitwise-clone/
├── server/                       # Express API
│   ├── config/db.js              # Mongo connection
│   ├── models/                   # User, Group, Expense, Settlement
│   ├── controllers/              # route handlers
│   ├── routes/                   # auth + group (nested expense/balance) routes
│   ├── middleware/                # JWT auth, group-membership guard, error handler
│   ├── services/debtSimplifier.js # the core algorithm (pure functions)
│   ├── tests/                    # Jest unit tests for the algorithm
│   └── server.js
├── client/                       # React app (Vite)
│   └── src/
│       ├── api/axios.js          # axios instance with JWT interceptor
│       ├── context/AuthContext.jsx
│       ├── pages/                # Login, Register, Dashboard, GroupDetail
│       └── components/           # ExpenseForm, BalanceTable, SimplifiedDebts, ActivityFeed…
└── render.yaml                   # one-click backend deploy blueprint for Render
```

---

## Core Algorithm

Given a group's expenses and settlements:

1. **`computeNetBalances()`** walks every expense and settlement once (`O(E + S)`) and produces a map of `userId → net balance` (positive = owed money, negative = owes money).
2. **`simplifyDebts()`** splits members into creditors and debtors, sorts each by amount (`O(n log n)`), then greedily matches the largest creditor against the largest debtor until all balances are zero. This guarantees **at most `n - 1` transactions** for `n` people with a non-zero balance — instead of the up-to `n(n-1)/2` transactions a naive pairwise settlement would need.

> Note: this greedy approach is a well-known, industry-standard approximation. Finding the mathematically optimal *minimum* number of transactions in the general case is NP-hard (it reduces to a subset-sum-like problem), so greedy min-cash-flow is the practical choice used by real apps like Splitwise.

Run the tests:
```bash
cd server
npm test
```

---

## API Reference

All routes except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, receive a JWT |
| GET  | `/api/auth/me` | Get the logged-in user |
| POST | `/api/groups` | Create a group (optionally invite by email) |
| GET  | `/api/groups` | List groups the user belongs to |
| GET  | `/api/groups/:id` | Get a single group |
| POST | `/api/groups/:id/members` | Add a member by email |
| POST | `/api/groups/:groupId/expenses` | Add an expense (equal / unequal / percentage split) |
| GET  | `/api/groups/:groupId/expenses` | List a group's expenses |
| DELETE | `/api/groups/:groupId/expenses/:expenseId` | Delete an expense |
| GET  | `/api/groups/:groupId/balances` | Raw net balance per member |
| GET  | `/api/groups/:groupId/simplify` | Minimal set of settle-up transactions |
| POST | `/api/groups/:groupId/settle` | Record a payment between two members |
| GET  | `/api/groups/:groupId/activity` | Combined feed of expenses + settlements |

---

## Running Locally

### Prerequisites
- Node.js 18+
- A MongoDB connection string (local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
npm run dev             # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env   # VITE_API_URL defaults to http://localhost:5000/api
npm run dev             # starts on http://localhost:5173
```

Open `http://localhost:5173`, register an account, and create your first group.

---

## Deploying

### Backend → Render (or Railway)

1. Push this repo to GitHub.
2. On [Render](https://render.com), click **New → Blueprint** and point it at this repo — it will pick up `render.yaml` automatically. (Or create a Web Service manually with root directory `server`, build command `npm install`, start command `npm start`.)
3. Set the environment variables in the Render dashboard:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — any long random string
   - `CLIENT_URL` — your deployed frontend URL (for CORS)
4. Note the deployed API URL, e.g. `https://splitwise-server.onrender.com`.

### Database → MongoDB Atlas

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Add a database user and allow network access from anywhere (`0.0.0.0/0`) for simplicity, or Render's static IPs for tighter security.
3. Copy the connection string into `MONGO_URI`.

### Frontend → Vercel (or Netlify)

1. Import the repo on [Vercel](https://vercel.com), set the **root directory** to `client`.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist` (Vercel auto-detects these).
3. Add environment variable `VITE_API_URL` = your Render backend URL + `/api` (e.g. `https://splitwise-server.onrender.com/api`).
4. Deploy. Update the backend's `CLIENT_URL` env var to match this Vercel URL once you have it, and redeploy the backend so CORS allows it.

---

## What to Highlight in an Interview

- **Data modeling trade-off:** why balances are derived, not stored (consistency vs. compute cost).
- **The greedy algorithm:** walk through `simplifyDebts()` on a whiteboard — 3-4 people, tangled debts, reduced to 2 transactions. Mention the NP-hard optimal-case caveat.
- **Validation:** server-side checks that unequal/percentage splits always sum correctly, and that only group members can view/mutate group data (`requireGroupMember` middleware).
- **Testing:** the algorithm is a pure function, tested independently of Express/Mongo — a good example of separating business logic from framework code.

---

## Possible Extensions

- Recurring expenses (rent, subscriptions)
- Multi-currency support with exchange-rate conversion
- Email/push notifications when added to a group or when someone settles up
- Expense categories + monthly spend charts
- Optimistic UI updates with React Query instead of manual refetching

---


