# Medical Research Drug Library

A secure, responsive, full-stack web application for clinical researchers and healthcare administrators to access, view, compare, and export medical research publications across 7 therapeutic categories and 19 verified drug publications.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Supabase (Auth, PostgreSQL, RLS, Storage)**, and optimized for **Vercel**.

---

## 1. Product Features & Requirements

- **Redesigned Landing & Sign-In Experience**:
  - Research User sign-in is the primary action directly on the landing page (`/`), with display-name entry, language preference, and direct access.
  - "Are you an Admin?" section with "Admin Sign In" secondary button navigating to the authenticated administrator login (`/admin-login`).
  - Server-verified Supabase authentication with role verification in `profiles` (no public registration).
- **Research User Experience**:
  - Enters a display name without password friction in v1.
  - Chooses preferred language (**English** is active; **Hindi** and **Gujarati** are marked "Coming Soon").
  - Server generates a unique internal research session UUID (display names are never used as IDs).
- **Approved 7 Categories & 19 Drugs (Preserved Exactly)**:
  1. **Biguanides**: Metformin
  2. **DPP-4 Inhibitors**: Sitagliptin, Vildagliptin, Linagliptin, Saxagliptin
  3. **TZDs (Thiazolidinediones)**: Pioglitazone
  4. **Sulfonylureas**: Glimepiride, Glipizide, Glibenclamide, Gliclazide
  5. **Alpha-glucosidase Inhibitors**: Acarbose, Miglitol, Voglibose
  6. **SGLT-2 Inhibitors**: Empagliflozin, Canagliflozin, Dapagliflozin
  7. **Non-Sulphonylureas**: Nateglinide, Repaglinide, Semaglutide
- **High-DPI In-App PDF Viewer (Device Pixel Ratio Aware)**:
  - Vector-sharp rendering on Retina, high-DPI mobile screens, and laptops by separating physical canvas backing resolution (`canvas.width * outputScale`) from CSS display dimensions (`canvas.style.width`).
  - Device-tailored default zoom: **60% on mobile (<768px)**, **80% on desktop/laptop (>=1024px)**, and **Fit to Width on tablets (768px-1023px)**.
  - Recalculates default zoom when crossing device breakpoints while strictly preserving user manual zoom within the same device category.
  - Memory-safe lazy rendering with in-flight cancellation to protect mobile memory.
- **Side-by-Side Comparison**: Independent dual-pane viewer for comparing two research papers simultaneously, featuring mobile tabs and stacked view modes.
- **Downloads**:
  - **Individual PDF**: Direct streaming download with audit tracking.
  - **Multi-PDF ZIP Archive**: Bundles multiple selected publications into a single ZIP using `fflate`.
  - **Combined Landscape Comparison PDF**: Dynamically renders corresponding pages from two documents side-by-side using `pdf-lib`.
- **Activity Tracking & Telemetry**: Records `session_started`, `drug_opened`, `pdf_viewed`, `comparison_opened`, `pdf_downloaded`, `zip_downloaded`, and `comparison_pdf_downloaded`.
- **Administrator Portal**:
  - Protected by Supabase Auth and server-verified `admin` role in `profiles`.
  - Live analytics dashboard showing actual Supabase database metrics (no hard-coded mocks).
  - Searchable, filterable activity explorer with server-side pagination.
  - Formatted Microsoft Excel (`.xlsx`) export with automated spreadsheet formula injection protection (`=`, `+`, `-`, `@`).

---

## 2. Architecture & File Structure

```text
├── app/
│   ├── layout.tsx                     # Root HTML layout with responsive styles
│   ├── page.tsx                       # Landing page (Research vs Admin choice)
│   ├── globals.css                    # Tailwind CSS and accessibility rules
│   ├── research-entry/                # Display name & language onboarding
│   ├── admin-login/                   # Supabase Auth email/password login
│   ├── library/                       # Search, category filter & drug list
│   ├── drugs/[slug]/                  # Drug detail & in-app PDF viewer
│   ├── compare/                       # Side-by-side comparison & combined PDF
│   ├── admin/
│   │   ├── dashboard/                 # Real database analytics dashboard
│   │   ├── activity/                  # Searchable, filterable activity explorer
│   │   └── exports/                   # Excel export configuration center
│   └── api/
│       ├── research/session/          # Session creation endpoint
│       ├── research/logout/           # Session termination endpoint
│       ├── drugs/                     # Category and drug catalog endpoint
│       ├── drugs/[id]/                # Single drug metadata endpoint
│       ├── files/signed-url/          # Authorizes & generates short-lived signed URLs
│       ├── download/individual/       # Direct PDF download with tracking
│       ├── download/zip/              # Multi-PDF ZIP bundle generation
│       ├── download/comparison/       # Combined landscape comparison PDF generation
│       ├── activity/                  # Activity logging endpoint
│       ├── admin/metrics/             # Live database telemetry
│       ├── admin/activity/            # Paginated activity query with filters
│       └── admin/export/              # Excel (.xlsx) report generation
├── components/
│   ├── library/                       # Header, DrugList, SelectionBar
│   ├── pdf/                           # PdfViewer (PDF.js canvas renderer)
│   ├── comparison/                    # ComparisonView (dual viewer panes)
│   └── admin/                         # ActivityExplorer table and filter UI
├── lib/
│   ├── supabase/                      # SSR client, service-role client, database types
│   ├── auth/                          # Research sessions & Admin verification
│   ├── activity/                      # Activity event logging
│   ├── validation/                    # Zod schemas for all requests
│   ├── pdf/                           # Combined landscape PDF generation
│   └── exports/                       # ExcelJS generator & formula injection sanitizer
├── scripts/
│   ├── generate-drug-manifest.mjs     # Inspects drugs/ and maps to approved list
│   ├── upload-drug-pdfs.mjs           # Uploads to private bucket & updates DB
│   ├── verify-drug-pdfs.mjs           # Verifies all 19 PDFs in storage & DB
│   └── provision-admin.mjs            # Provisions verified initial admin user
├── supabase/
│   ├── migrations/                    # Version-controlled SQL schema & RLS
│   └── seed.sql                       # 7 categories and 19 approved drugs
├── tests/                             # Automated Vitest unit tests
├── drugs/                             # Supplied clinical PDFs organized by category
├── .env.example                       # Environment variable template
└── README.md                          # Documentation
```

---

## 3. Environment Variables

Create a local `.env.local` file (never commit secrets to version control):

```env
# Client-safe Supabase variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only variables (NEVER expose to client)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`.env.example` provides the template for team members and Vercel environment variable configuration.

---

## 4. Supabase Setup & PDF Ingestion

### Step 1: Apply SQL Migrations & RLS
Apply the schema located at `supabase/migrations/20261030000000_init_schema.sql` via Supabase Dashboard SQL Editor or Supabase CLI.

This creates:
- `categories`, `drugs`, `profiles`, `research_sessions`, `activity_events`, and `admin_audit_logs`.
- Enables Row Level Security (RLS) on all tables.
- Sets up private Storage bucket `research-pdfs`.

### Step 2: Seed the Approved Catalog
Execute `supabase/seed.sql` to populate the approved 7 categories and 19 drugs.

### Step 3: Provision the Initial Administrator
Run the provisioning script to create the initial admin user with confirmed email and verified `admin` role in `profiles`:

```bash
node scripts/provision-admin.mjs
```

Default credentials:
- **Email**: `admin@medicalresearch.org`
- **Password**: `MedicalAdmin2026!`

### Step 4: PDF Ingestion & Verification Scripts
The application provides repeatable, robust ingestion scripts:

1. **Generate Manifest** (Inspect local files without modifying remote storage):
   ```bash
   npm run manifest:generate
   ```
   Inspects `drugs/`, matches each approved drug case-insensitively, and creates `drug-manifest.json`.

2. **Upload Drug PDFs** (Uploads to private `research-pdfs` bucket and updates DB):
   ```bash
   npm run manifest:upload
   ```
   *Note: Skips files already uploaded. Pass `--replace` to overwrite existing files.*

3. **Verify Uploaded PDFs**:
   ```bash
   npm run manifest:verify
   ```
   Validates that all 19 drugs exist in Supabase Storage, have valid database paths, and can generate signed URLs.

---

## 5. Running the Application Locally

```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Run Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application:
- `/`: Landing page
- `/research-entry`: Research user registration
- `/library`: Drug catalog & multi-select actions
- `/compare`: Side-by-side comparison
- `/admin-login`: Admin authentication
- `/admin/dashboard`: Metrics & recent events
- `/admin/activity`: Filterable activity explorer
- `/admin/exports`: Excel report center

---

## 6. Automated Tests

Run the test suite with Vitest:

```bash
npm test
```

Tests verify:
- **Zod Schemas**: Input lengths, display name trimming, language constraints, UUID validation.
- **Excel Formula Injection Sanitization**: Neutralizes formulas starting with `=`, `+`, `-`, and `@`.
- **Manifest Integrity**: Validates that all 19 approved drugs and 7 categories map to files with 0 missing, 0 ambiguous, and 0 duplicates.

---

## 7. Vercel Deployment Instructions

1. **Push Repository to GitHub / GitLab**:
   Ensure `.env.local` is ignored and `.env.example` is committed.
2. **Create New Project in Vercel**:
   - Import the repository.
   - Framework preset: **Next.js**.
3. **Configure Environment Variables in Vercel**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
4. **Deploy**:
   - Click **Deploy**.
   - Build command: `npm run build`
   - Output directory: `.next`
5. **Post-Deployment Verification**:
   - Log in to the production URL.
   - Enter as Research User and open any drug PDF.
   - Sign in as Admin at `/admin-login` and verify live telemetry on the dashboard.
   - Export an activity log to `.xlsx` to confirm ExcelJS generation.

---

## 8. Security & Data Integrity Guarantees

- **Private Storage**: PDFs are stored in the private `research-pdfs` Supabase Storage bucket. Files are accessed only via short-lived signed URLs (5–10 minutes) or authenticated streaming endpoints.
- **Server-Derived Identity**: Researcher and Admin identities are derived strictly from verified HTTP-only session cookies or Supabase Auth JWTs.
- **Formula Injection Mitigation**: Untrusted user strings exported to Excel that begin with spreadsheet formula operators (`=`, `+`, `-`, `@`) are escaped.
- **Bounded ZIP & PDF Operations**: File count and memory bounds prevent function timeouts on serverless environments.

