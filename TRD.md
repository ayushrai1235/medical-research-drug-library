# Medical Research Drug Library — Technical Requirements Document (TRD)

**Version:** 1.1  
**Stack:** Next.js 16 + TypeScript + Supabase + Vercel

## 1. Architecture

```text
Browser
  └── Next.js App Router on Vercel
       ├── Server Components / Client Components
       ├── Route Handlers / Server Actions
       ├── Supabase SSR client
       └── Server-only privileged operations
            ├── Supabase Auth
            ├── Supabase PostgreSQL + RLS
            └── Private Supabase Storage
```

No separate backend is required for the normal application. PDF/ZIP generation must be bounded; if it exceeds Vercel function limits, use an appropriate asynchronous job/storage workflow.

## 2. Dependencies and implementation choices

- `@supabase/supabase-js`
- `@supabase/ssr`
- `zod`
- `react-hook-form`
- `react-pdf` / PDF.js or another maintained PDF.js-based viewer
- `pdf-lib` or a tested equivalent for combining pages
- A maintained ZIP library such as `fflate`
- `exceljs`
- `dotenv` for local ingestion scripts
- `lucide-react`
- Tailwind CSS and shadcn/ui

Pin compatible package versions in the lockfile. Verify library support against the supplied PDFs, especially scanned pages, large images, rotation, fonts, and page-size differences.

## 3. Authentication and session model

### Research user
- Ask for display name only in the UI.
- Prefer Supabase Anonymous Auth if enabled and suitable; use the authenticated `auth.uid()` as the unique user ID.
- If Anonymous Auth is not enabled, use a secure server-issued session cookie and a corresponding session table. Do not treat a client-generated ID or display name as authentication.
- Validate and normalize names server-side.
- Same-name users must remain distinct.
- Implement logout/end-session behavior and appropriate session expiry.
- Add rate limiting/abuse controls to session creation.

### Administrator
- Supabase Auth email/password.
- Admin role assigned through a trusted provisioning flow only.
- Verify admin role on the server for every protected page, route handler, server action, and export.
- No public admin sign-up.
- UI hiding is not authorization.

Use the current recommended Supabase SSR pattern compatible with the installed Next.js version. Do not blindly copy deprecated middleware examples.

## 4. Database schema

Implement version-controlled SQL migrations. Use UUID primary keys, foreign keys, constraints, indexes, and server-generated timestamps.

### `profiles`
- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `email text null`
- `role text not null default 'researcher' check (role in ('researcher','admin'))`
- `preferred_language text not null default 'en' check (preferred_language in ('en','hi','gu'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Prevent users from updating their own role. Use a trusted admin provisioning path.

### `categories`
- `id uuid primary key default gen_random_uuid()`
- `name text not null unique`
- `slug text not null unique`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `drugs`
- `id uuid primary key default gen_random_uuid()`
- `category_id uuid not null references categories(id)`
- `name text not null`
- `slug text not null unique`
- `description text null` (verified metadata only)
- `pdf_storage_path text null`
- `pdf_status text not null default 'missing' check (pdf_status in ('missing','mapped','uploaded','failed','ambiguous'))`
- `is_active boolean not null default true`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Seed the exact project-provided list:

1. Biguanides — Metformin
2. DPP-4 Inhibitors — Sitagliptin, Vildagliptin, Linagliptin, Saxagliptin
3. TZDs (Thiazolidinediones) — Pioglitazone
4. Sulfonylureas — Glimepiride, Glipizide, Glibenclamide, Gliclazide
5. Alpha-glucosidase Inhibitors — Acarbose, Miglitol, Voglibose
6. SGLT-2 Inhibitors — Empagliflozin, Canagliflozin, Dapagliflozin
7. Non-Sulphonylureas (project-provided grouping) — Nateglinide, Repaglinide, Semaglutide

Preserve the supplied grouping.

### `activity_events`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid null references auth.users(id) on delete set null`
- `display_name_snapshot text not null`
- `session_id text null`
- `action text not null check (action in ('session_started','drug_opened','pdf_viewed','drug_selected','comparison_opened','pdf_downloaded','zip_downloaded','comparison_pdf_downloaded'))`
- `drug_id uuid null references drugs(id) on delete set null`
- `related_drug_ids uuid[] not null default '{}'`
- `details jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

For normalized reporting, optionally add `activity_event_drugs(event_id, drug_id)` with foreign keys. A ZIP event must list all included drug IDs.

### Optional `admin_audit_logs`
- `id uuid primary key default gen_random_uuid()`
- `admin_user_id uuid not null references auth.users(id)`
- `action text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `details jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

## 5. RLS and authorization

Enable RLS on all application tables.

Researchers:
- Read active category and drug metadata.
- Read/update only permitted profile fields.
- Cannot read all profiles or admin activity.
- Cannot modify categories/drugs.
- Cannot assign roles.
- Cannot create events for another user or submit arbitrary privileged actions.
- Access PDFs only through authorized signed URLs or protected endpoints.

Admins:
- Read profiles and activity logs.
- Manage categories, drugs, and PDF mappings if management UI is enabled.
- Export reports.
- Access must be validated server-side and enforced in RLS where appropriate.

Use the service-role key only in server-only code. Never use it in client components or expose it through `NEXT_PUBLIC_` variables. Do not trust a client-supplied `user_id`, role, storage path, timestamp, or success status.

## 6. Supabase Storage

Create a private bucket named `research-pdfs`.

Suggested object path:
`drugs/<category-slug>/<drug-name>.pdf`

Examples:
- `drugs/biguanides/Metformin.pdf`
- `drugs/dpp-4-inhibitors/Sitagliptin.pdf`

Store the object path in `drugs.pdf_storage_path`, not a permanent signed URL.

- Bucket must remain private.
- Generate short-lived signed URLs only after server-side authorization, or use a protected download endpoint.
- Resolve paths from trusted database records.
- Validate PDF MIME type and upload size.
- Do not serve private PDFs from `public/`.
- Avoid overwriting existing objects unexpectedly.
- Replacement uploads must preserve the old file until the new file is verified.

## 7. Mandatory PDF manifest and ingestion implementation

Implement a working script at `scripts/upload-drug-pdfs.mjs`, plus a manifest/report workflow. This is a required deliverable, not pseudocode.

### Required behavior
1. Recursively inspect the local `drugs/` directory.
2. Find PDF files case-insensitively.
3. Match PDFs to the approved 19 drugs and 7 categories using filenames and directory names.
4. Normalize names for matching but flag ambiguous matches for human review.
5. Never attach a mismatched PDF to a drug.
6. Generate a manifest containing drug name, category, local relative path, file size, proposed Storage path, mapping status, and upload status.
7. Report missing, duplicate, ambiguous, already-existing, uploaded, and failed files.
8. Upload confirmed mappings to the private `research-pdfs` bucket.
9. Verify each uploaded object through Storage metadata/listing or an equivalent reliable check.
10. Update the matching `drugs.pdf_storage_path` and `pdf_status` in PostgreSQL only after the object is verified.
11. Be safe to rerun. Do not overwrite existing files unless an explicit `--replace` or equivalent option is passed.
12. Support retries for failed uploads and provide a final summary with counts.
13. Exit non-zero when required mappings remain unresolved or uploads fail, while still writing a detailed report.
14. Never print secret values in logs.

### Environment variables for ingestion

Use a server-only `.env.local` configuration, for example:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

The service-role key is permitted only in the local/server-side ingestion script and server-only application modules. Never prefix it with `NEXT_PUBLIC_`, commit it, or bundle it into browser code. Add `.env.local` to `.gitignore`.

### Script commands to document
- Install required dependencies.
- Generate/inspect the manifest without uploading.
- Upload verified mappings.
- Verify existing uploads.
- Retry failures.
- Replace a file only with an explicit opt-in.

The implementation must use the actual local files and real Supabase credentials when available. If credentials or files are unavailable in the coding environment, report that blocker honestly and leave a tested/configurable script; do not claim that the real upload happened.

## 8. API and server-action contracts

Suggested endpoints:

- `POST /api/research/session` — validate display name and establish session/profile.
- `POST /api/activity` — validate allowed event and derive identity from verified session.
- `GET /api/drugs` — list/search active categories and drugs.
- `GET /api/drugs/[id]` — permitted drug metadata.
- `POST /api/files/signed-url` — authorize access and return a short-lived URL.
- `POST /api/download/zip` — validate drug IDs, create ZIP, and record outcome.
- `POST /api/download/comparison` — validate two drug IDs and generate combined PDF.
- `GET /api/admin/activity` — admin-only paginated activity.
- `GET /api/admin/export` — admin-only Excel export.
- Admin server actions for category/drug management and PDF replacement.

Validate request bodies with Zod. Apply rate limits and size/time limits to session creation, signed URL generation, ZIP creation, PDF generation, and exports.

## 9. PDF viewer and comparison

### Viewer
- Use a maintained PDF.js-based viewer.
- Provide page controls, zoom, fit-to-width, and responsive layout.
- Load via authorized short-lived URLs or a protected endpoint.
- Record `pdf_viewed` only when the document successfully opens, not on every render.

### Side-by-side comparison
- Desktop: two independent viewer panes.
- Mobile: tabs or stacked panels.
- Each pane has independent page navigation and zoom.
- For 3+ selected drugs, let the user choose the active pair.

### Combined comparison PDF
- Generate a landscape page per page index.
- Place each source PDF's corresponding page in left/right halves.
- If one document ends first, leave that side blank for remaining pages.
- Keep source documents unchanged.
- Preserve vector/text content where possible.
- Test scanned documents, different page dimensions, rotation, fonts, and large images.
- Bound input size, page count, memory, and execution time.
- If Vercel function limits are exceeded, use a suitable asynchronous generation workflow.
- Return a descriptive filename and record the event only after successful generation/delivery according to the chosen implementation.

### ZIP
- Resolve file paths from database records only.
- Validate active records and permissions.
- Enforce file-count and total-size limits.
- Use safe filenames; prevent path traversal.
- Handle missing documents clearly.
- Record all included drug IDs and actual success/failure.

## 10. Excel export

Use ExcelJS server-side. Require admin authorization before querying data.

Include:
- Display name
- Action
- Related drug names
- Category where applicable
- Timestamp
- Download type
- Event ID

Support filters for date, user, drug, category, action, and download type. Bound export sizes. Neutralize untrusted values beginning with spreadsheet formula characters such as `=`, `+`, `-`, and `@`. Record admin export actions.

## 11. Suggested folder structure

```text
app/
  page.tsx
  research-entry/
  admin-login/
  library/
  drugs/[slug]/
  compare/
  admin/
    dashboard/
    activity/
    categories/
    drugs/
    exports/
  api/
    research/session/route.ts
    activity/route.ts
    files/signed-url/route.ts
    download/zip/route.ts
    download/comparison/route.ts
    admin/activity/route.ts
    admin/export/route.ts

components/
  ui/
  auth/
  library/
  pdf/
  comparison/
  admin/

lib/
  supabase/
  auth/
  validation/
  security/
  pdf/
  exports/
  activity/

scripts/
  upload-drug-pdfs.mjs
  verify-drug-pdfs.mjs
  generate-drug-manifest.mjs

supabase/
  migrations/
  seed.sql

drugs/
  [local supplied PDFs]

.env.example
README.md
```

Adapt to existing repository conventions and avoid duplicate/conflicting routes.

## 12. Environment variables

`.env.example` should include placeholders only:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Use only the variables needed by each environment. Validate variables. Keep actual secrets in `.env.local` and Vercel server environment settings. Never commit real secrets.

## 13. Test plan

Test:
- Research/Admin entry paths.
- Unique sessions for users with the same name.
- Admin authorization and denial for researchers.
- RLS on every table.
- Private Storage access and signed URL expiry.
- Exact 7-category/19-drug seed data.
- PDF filename mapping and ambiguous/missing file reports.
- Upload idempotency and overwrite protection.
- Database paths only updating after verified upload.
- PDF viewer and independent comparison controls.
- Combined PDF with unequal page counts.
- ZIP limits and failure handling.
- Correct view vs download activity.
- Excel filters and formula injection protection.
- Mobile accessibility.
- Vercel build/runtime limits.

## 14. Deployment checklist

1. Create Supabase project.
2. Apply SQL migrations and RLS.
3. Enable Anonymous Auth if used for research users.
4. Provision the first admin through a trusted method.
5. Create private `research-pdfs` bucket.
6. Place supplied PDFs in local `drugs/`.
7. Generate and review manifest.
8. Upload and verify PDFs using the ingestion script.
9. Verify database mappings and missing-file status.
10. Configure environment variables locally and in Vercel.
11. Configure Supabase Auth site/redirect URLs.
12. Run security, Storage, download, and PDF-generation tests.
13. Deploy to Vercel and verify logs without exposing secrets.
