# Teddy Mobile — Stock Management System

A modern, full‑stack Stock Management System purpose‑built for **Teddy Mobile**, a mobile phone retail business. It handles inventory (with IMEI tracking), repairs, profit calculation with partner splits (Thabrew / Kelan), partner payments, audit/stock‑checks, PDF reporting and a role‑based admin/cashier workflow.

Built with **React + Vite** on the front end and **Supabase (Postgres + Auth)** on the back end. Deployed on **Vercel**.

<p align="center">
  <img src="./public/tdy-logo.png" alt="Teddy Mobile Logo" width="160" />
</p>

<p align="center">
  <img alt="React"    src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="Vite"     src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white">
  <img alt="Vercel"   src="https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel&logoColor=white">
  <img alt="License"  src="https://img.shields.io/badge/License-Proprietary-A7040E">
</p>

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Database Schema (Supabase)](#database-schema-supabase)
7. [Available Scripts](#available-scripts)
8. [Routes & Access Control](#routes--access-control)
9. [Brand Guidelines](#brand-guidelines)
10. [Deployment](#deployment)
11. [Design Documents](#design-documents)
12. [License](#license)

---

## Features

### Stock Management
- Full CRUD operations for inventory
- Auto stock code generation (`TDY-XXXX` from last 4 digits of IMEI)
- Search by stock code, IMEI, or phone model
- Filter by state (`in_stock` / `sold`) and price range
- Mark items as sold with automatic move to `sold_stocks`
- Repair workflow (issue device for repair → receive back)

### Profit Calculation Tool
- Per‑sale phone & accessory tracking
- Automatic **80 / 20** profit split between Thabrew and Kelan
- Manual adjustment entries for both partners
- Save reports to the database & regenerate PDFs on demand

### Reports
- View all saved profit reports with date filtering
- Daily profit trend chart (admin only)
- Per‑report PDF download
- Thabrew & Kelan share summaries

### Analytics Dashboard (Admin)
- Best‑selling days of the week (bar chart)
- Phone vs Accessory revenue split
- Monthly profit goal tracking with progress bar
- Date range filtering on all metrics

### Stock Check (Audit)
- Start a verification session
- Real‑time progress tracking of verified vs missing items
- Detect missing inventory
- Generate audit PDF reports

### Kelan Payment Tracking
- Live balance summary: **earned − paid = due**
- Full payment history
- Add new payment entries

### User Management (Admin)
- Admin and Cashier roles
- Role‑based access control
- Admin‑only user CRUD

---

## Tech Stack

| Layer        | Technology                                            |
| ------------ | ----------------------------------------------------- |
| Front end    | React 18, Vite 5, React Router v6                     |
| Back end     | Supabase (PostgreSQL + Auth + Row‑Level Security)     |
| Charts       | Chart.js + `react-chartjs-2`                          |
| PDF reports  | `jspdf` + `jspdf-autotable`                           |
| Icons        | `lucide-react`                                        |
| Styling      | Hand‑written CSS with a design‑token system           |
| Hosting      | Vercel (SPA with catch‑all rewrite to `/`)            |

---

## Project Structure

```
.
├── public/
│   └── tdy-logo.png
├── src/
│   ├── components/
│   │   ├── Analytics.jsx
│   │   ├── ProfitTrendChart.jsx
│   │   └── Layout/
│   │       ├── ProtectedRoute.jsx
│   │       ├── Sidebar.jsx
│   │       └── TopHeader.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx        # Supabase session + role
│   │   └── ThemeContext.jsx       # Light / dark theme
│   ├── lib/
│   │   └── supabase.js            # Supabase client singleton
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Stock.jsx              # Stock + Sold + Repairs tabs
│   │   ├── StockCheck.jsx
│   │   ├── ProfitTool.jsx         # Calculations + Kelan payments
│   │   ├── Reports.jsx
│   │   ├── AnalyticsPage.jsx
│   │   └── Users.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── index.html
├── vercel.json                    # SPA rewrite to /
├── vite.config.js
└── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18
- A **Supabase** project (URL + anon key)

### Installation

```bash
# 1. Clone
git clone <your-repo-url>
cd Teddy-mobile-inventry-management-system

# 2. Install dependencies
npm install

# 3. Create env file
cp .env.example .env
# then edit .env with your Supabase credentials

# 4. Run dev server
npm run dev
```

The app will open at <http://localhost:5173>.

---

## Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

> Variables **must** be prefixed with `VITE_` to be exposed to the browser by Vite.

---

## Database Schema (Supabase)

The application relies on the following tables. Detailed DDL and indexes live in [`docs/LLD.md`](./docs/LLD.md#3-database-schema-supabase-postgres).

| Table             | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `users`           | Application profile + role (`admin` / `cashier`)           |
| `stocks`          | Inventory currently in stock                               |
| `sold_stocks`     | Archive of sold inventory (move‑on‑sale pattern)           |
| `repairs`         | Devices currently issued out for repair                    |
| `stock_checks`    | Audit sessions with verified/missing arrays                |
| `profit_reports`  | Saved daily profit calculations + partner totals (JSONB)   |
| `kelan_payments`  | Payouts to partner "Kelan"                                 |

Authentication is handled by **Supabase Auth** (`auth.users`); a row in the public `users` table with the same `id` carries the role.

---

## Available Scripts

| Command         | Description                                |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Start Vite dev server on port 5173         |
| `npm run build` | Production build to `dist/`                |
| `npm run preview` | Preview the production build locally     |
| `npm run lint`  | Run ESLint over the codebase               |

---

## Routes & Access Control

| Page              | Route           | Access            |
| ----------------- | --------------- | ----------------- |
| Login             | `/login`        | Public            |
| Dashboard         | `/dashboard`    | Authenticated     |
| Stock Management  | `/stock`        | Authenticated     |
| Stock Check       | `/stock-check`  | Authenticated     |
| Profit Tool       | `/profit`       | Authenticated     |
| Reports           | `/reports`      | Authenticated     |
| Analytics         | `/analytics`    | **Admin only**    |
| User Management   | `/users`        | **Admin only**    |

Guarding is implemented in `src/components/Layout/ProtectedRoute.jsx`. Unknown routes redirect to `/dashboard`.

---

## Brand Guidelines

| Color        | Hex       | Usage                          |
| ------------ | --------- | ------------------------------ |
| Primary Red  | `#E10613` | Primary actions, branding      |
| Dark Red     | `#A7040E` | Hover / pressed states         |
| Black        | `#1A1A1D` | Text, dark surfaces            |

---

## Deployment

The project is configured for **Vercel**:

1. Push the repo to GitHub.
2. Import the project on Vercel.
3. Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables under **Project Settings → Environment Variables**.
4. The included `vercel.json` rewrites all paths to `/` so client‑side routing works.

---

## Design Documents

- [High‑Level Design (HLD)](./docs/HLD.md) — system overview, architecture, modules, data flow, NFRs.
- [Low‑Level Design (LLD)](./docs/LLD.md) — schema, component responsibilities, state, key algorithms, edge cases.

---

## License

Proprietary software for **Teddy Mobile**. All rights reserved.
