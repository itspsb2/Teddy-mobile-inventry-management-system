# Teddy Mobile - Stock Management System

A modern full-stack Stock Management System built with **React + Vite** and **Supabase** for mobile phone retail with inventory management, profit calculation, analytics, and audit tracking.

![Teddy Mobile Logo](./public/tdy-logo.png)

## 🚀 Features

### Stock Management
- Full CRUD operations for inventory
- Auto stock code generation (`TDY-XXXX` from IMEI last 4 digits)
- Search by code, IMEI, or phone model
- Filter by state (in stock / sold)
- Mark as sold with profit calculation

### Analytics Dashboard
- **Best Selling Days** - Visual bar chart showing profit by day of week
- **Phone vs Accessory Split** - Revenue breakdown with visual comparison
- **Monthly Goal Tracking** - Progress bar toward monthly profit targets
- Date range filtering for all metrics

### Profit Calculation Tool
- Phone & accessory sales tracking
- Automatic 80/20 profit split (Thabrew / Kelan)
- PDF report generation
- Save reports to database

### Reports
- View all profit reports with date filtering
- Daily profit trend charts (admin only)
- Download individual reports as PDF
- Thabrew and Kelan share summaries

### Stock Check (Audit)
- Start verification sessions
- Real-time progress tracking
- Missing items detection
- PDF audit reports

### Kelan Payment Tracking
- Balance summary (earned / paid / due)
- Payment history
- Add new payments

### User Management
- Admin and Cashier roles
- Role-based access control
- Admin-only user management

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router v6
- **Backend**: Supabase (PostgreSQL + Auth)
- **Charts**: Chart.js + react-chartjs-2
- **PDF**: jsPDF + jspdf-autotable
- **Icons**: Lucide React
- **Styling**: Vanilla CSS with modern design system

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy your Project URL and anon key
3. Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the contents of `supabase-schema.sql`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🎨 Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Red | #E10613 | Primary actions, branding |
| Dark Red | #A7040E | Hover states |
| Black | #1A1A1D | Text, backgrounds |

## 📱 Pages

| Page | Route | Access |
|------|-------|--------|
| Login | /login | Public |
| Dashboard | /dashboard | Authenticated |
| Stock Management | /stock | Authenticated |
| Stock Check | /stock-check | Authenticated |
| Profit Tool | /profit | Authenticated |
| Reports | /reports | Authenticated |
| Analytics | /analytics | Authenticated |
| User Management | /users | Admin only |

## 📄 License

Proprietary software for Teddy Mobile.
