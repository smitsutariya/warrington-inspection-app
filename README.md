# Warrington Condition Inspection App

iPad-optimized, BC-tenancy-compliant inspection management app built with **Next.js 14**, **Supabase**, and deployed on **Vercel**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (photos + PDFs) |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| PDF | jsPDF + jspdf-autotable |
| Email | SendGrid (optional) |

---

## Features

- ✅ Full BC Tenancy Regulation compliant inspection form
- ✅ Move-In & Move-Out inspection types
- ✅ Side-by-side Move-In vs Move-Out comparison
- ✅ Condition code system (✓ C D P M W S)
- ✅ Photo capture & management (camera on iPad)
- ✅ Signature capture (canvas, in-person or remote link)
- ✅ Security Deposit calculator with auto-balance
- ✅ PDF generation (full multi-page report with photos)
- ✅ Audit log for all field changes, signatures, events
- ✅ Email signing links via SendGrid
- ✅ Role-based access (Admin / PM / Building Manager)
- ✅ Offline-capable (drafts auto-save to Supabase)

---

## Setup Guide

### 1. Clone and install

```bash
git clone https://github.com/smitsutariya/warrington-inspection-app.git
cd warrington-inspection-app
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon key** from Settings → API
3. Also note your **service role key** (keep secret)

### 3. Run the database migration

In Supabase → SQL Editor, paste and run:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, storage buckets, triggers, and seed data.

### 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — for email signing links
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@warringtonresidential.ca
```

### 5. Create your first user

In Supabase → Authentication → Users → Invite user, or use:

```sql
-- Run in Supabase SQL Editor after creating user via dashboard
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel

# Set environment variables when prompted, or via dashboard
```

### Option B: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL (e.g. `https://warrington.vercel.app`) |
| `SENDGRID_API_KEY` | (Optional) SendGrid key |
| `SENDGRID_FROM_EMAIL` | (Optional) Sender email |

4. Click **Deploy**

### Update Supabase Auth Redirect URLs

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## App Structure

```
app/
├── (app)/                    # Authenticated app layout
│   ├── dashboard/            # Dashboard with stats + recent activity
│   ├── properties/           # Property cards grid
│   ├── inspections/
│   │   ├── page.tsx          # Inspections list with filters
│   │   ├── new/              # New inspection wizard (Step 1)
│   │   └── [id]/             # Individual inspection
│   │       ├── page.tsx      # Server component, loads all data
│   │       ├── InspectionDetail.tsx   # Tabbed inspection UI
│   │       ├── DepositCalculator.tsx  # Security deposit form
│   │       ├── SignaturePad.tsx       # Canvas signatures + email
│   │       ├── AuditLogView.tsx       # Timestamped audit trail
│   │       └── PhotoUpload.tsx        # Camera/file photo capture
│   ├── documents/            # Completed PDFs download list
│   ├── profile/              # User profile + role permissions
│   └── notifications/        # Notification preferences
├── auth/
│   ├── login/                # Email/password login
│   └── callback/             # OAuth callback handler
├── sign/[token]/             # Public tenant signing page (no auth)
└── api/
    └── inspections/
        ├── send-signing-link/ # POST — sends email via SendGrid
        └── generate-pdf/      # POST — returns structured PDF data

components/
└── layout/Sidebar.tsx        # Collapsible nav sidebar

lib/
├── supabase/
│   ├── client.ts             # Browser Supabase client
│   └── server.ts             # Server-side Supabase client
└── pdf.ts                    # Full PDF generation (jsPDF)

hooks/
└── usePDFGeneration.ts       # Client-side PDF gen + upload hook

supabase/migrations/
└── 001_initial_schema.sql    # Full DB schema, RLS, storage, seed

types/
└── index.ts                  # All TypeScript types
```

---

## Database Schema

### Core tables
- **profiles** — User accounts (extends Supabase auth)
- **properties** — Buildings (The Stories, Cascade Towers, etc.)
- **units** — Individual units per property
- **inspections** — Main inspection record (move-in or move-out)
- **inspection_sections** — Room sections (Kitchen, Bathroom, etc.)
- **inspection_items** — Individual items per section (from PDF)
- **inspection_responses** — Per-item condition codes + comments
- **inspection_photos** — Photo metadata (stored in Supabase Storage)
- **deposit_statements** — Security deposit calculations
- **audit_logs** — Full timestamped action trail

### Storage buckets
- **inspection-photos** — Room/item photos captured during inspection
- **inspection-pdfs** — Generated final PDF reports

---

## User Roles

| Feature | Admin | Property Manager | Building Manager |
|---|---|---|---|
| Create Inspection | ✓ | — | ✓ |
| Edit Inspection | ✓ | Limited | ✓ |
| Sign Report (PM) | — | ✓ | — |
| View All Properties | ✓ | ✓ | Assigned only |
| Manage Templates | ✓ | — | — |
| Export PDF | ✓ | ✓ | ✓ |
| View Audit Log | ✓ | ✓ | ✓ |
| Manage Users | ✓ | — | — |

---

## Inspection Workflow

### Move-In
1. Building Manager creates inspection (Setup page)
2. Fills in all room sections with condition codes
3. Tenant signs (in-person canvas or remote link via email)
4. Property Manager signs
5. System generates PDF → emails to all parties → locks report

### Move-Out
1. Building Manager creates move-out inspection, links prior move-in
2. Move-in codes load read-only, fill move-out codes side-by-side
3. Auto-generates damage comparison table
4. Deposit calculator computes balance
5. Same signature + PDF flow

---

## BC Tenancy Compliance

- Move-in report delivered to tenant within 7 days ✓
- Move-out report delivered within 15 days ✓  
- Both landlord and tenant signatures required ✓
- Tenant may record disagreement ✓
- Forwarding address recorded ✓
- Smoke alarm test documented ✓
- Keys & FOBs tracked ✓

---

## Local Development Tips

```bash
# Watch for TypeScript errors
npx tsc --watch

# Format code
npx prettier --write .

# Reset Supabase local (if using Supabase CLI)
supabase db reset
```

---

## Support

For BC Residential Tenancy Act requirements, refer to:
- [BC Tenancy Branch](https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies)
- RTB Form: Condition Inspection Report (RTB-27)
