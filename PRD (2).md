# Medical Research Drug Library — Product Requirements Document (PRD)

**Version:** 1.1  
**Status:** Implementation-ready draft  
**Product:** Medical Research Drug Library  
**Deployment:** Vercel  
**Backend platform:** Supabase

## 1. Product overview

Build a secure, responsive web application for browsing medical research documents supplied by the research team. The library contains **7 project-provided categories and 19 drug entries**. Users can open original PDF documents inside the app, compare two PDFs side by side, download individual documents, download multiple originals as a ZIP, and download a newly generated combined comparison PDF.

Administrators have a separate authenticated area for reviewing user activity, managing the document library, and exporting activity reports to Excel.

The supplied PDFs are the source documents. The application must not generate or invent clinical content.

## 2. Goals

- Ask visitors whether they want to continue as a Research User or use Admin Login.
- Allow research users to enter a display name without an email/password form in the initial release.
- Offer English (available), Hindi (Coming Soon), and Gujarati (Coming Soon).
- Display exactly 7 supplied categories and 19 drug entries after approved data is loaded.
- Use the supplied PDFs, stored privately in Supabase Storage.
- Support in-app PDF viewing and side-by-side comparison.
- Support individual PDF download, multi-PDF ZIP download, and combined comparison PDF download.
- Record viewing and download events distinctly.
- Let admins filter activity and export Excel reports.
- Provide a repeatable, verifiable script for mapping and uploading the local `drugs/` folder to Supabase Storage.

## 3. User roles

### 3.1 Research User
- Enters a display name and selects English.
- Browses categories and drugs.
- Views original PDFs inside the app.
- Selects multiple drugs.
- Compares two PDFs side by side.
- Downloads one original PDF, multiple originals as ZIP, or a combined comparison PDF.
- Ends their session.

Research users cannot view admin reports, manage the library, or export data.

### 3.2 Administrator
- Signs in through Supabase Auth using email/password.
- Must have a server-verified `admin` role.
- Views dashboard metrics and activity logs.
- Filters and exports activity reports.
- May manage categories, drug metadata, and PDF mappings if management UI is enabled.
- Can review missing or ambiguous PDF mappings.

Admin users must be provisioned through a trusted setup process. Public sign-up must never grant admin access.

## 4. Entry and user flows

### 4.1 Landing page
The first page asks: **“How would you like to continue?”**
- `Continue as Research User`
- `Admin Login`

### 4.2 Research entry
1. User selects Research User.
2. User enters a required display name.
3. User selects a language:
   - English — enabled and selected by default.
   - Hindi — disabled, labelled “Coming Soon”.
   - Gujarati — disabled, labelled “Coming Soon”.
4. User enters the library.
5. The app creates a unique session/user identity and records session start.

No email or password is requested from research users in v1. A display name is not identity verification. Use Supabase Anonymous Auth if enabled and appropriate; otherwise use a secure server-issued session mechanism. Same-name users must have separate IDs.

### 4.3 Library flow
1. Browse/search the 7 categories and 19 drugs.
2. Open a drug page and view its supplied PDF.
3. Select one or more drugs.
4. Choose Compare Selected (requires at least two) or Download Selected PDFs.
5. In comparison view, compare two original PDFs and optionally download a combined comparison PDF.
6. Record view, comparison, and download activity.

### 4.4 Admin flow
1. Choose Admin Login.
2. Sign in with Supabase Auth.
3. Verify admin role server-side.
4. Access protected dashboard, activity explorer, exports, and any enabled management pages.

## 5. Approved category and drug list

Preserve the research team's supplied grouping exactly for the initial release.

1. **Biguanides:** Metformin
2. **DPP-4 Inhibitors:** Sitagliptin, Vildagliptin, Linagliptin, Saxagliptin
3. **TZDs (Thiazolidinediones):** Pioglitazone
4. **Sulfonylureas:** Glimepiride, Glipizide, Glibenclamide, Gliclazide
5. **Alpha-glucosidase Inhibitors:** Acarbose, Miglitol, Voglibose
6. **SGLT-2 Inhibitors:** Empagliflozin, Canagliflozin, Dapagliflozin
7. **Non-Sulphonylureas (project-provided grouping):** Nateglinide, Repaglinide, Semaglutide

Total: 7 categories and 19 drug entries. Do not silently reclassify drugs.

## 6. Functional requirements

### FR-01 — Role selection
Display distinct Research User and Admin Login options with responsive design, accessible labels, loading states, and errors.

### FR-02 — Research session
Require a trimmed, non-empty display name with a sensible maximum length. Create a unique internal identity. Persist the session securely, provide an end-session action, and never use the display name as the primary key.

### FR-03 — Language
English is active. Hindi and Gujarati are visible but disabled and labelled “Coming Soon”. Do not imply translations exist.

### FR-04 — Drug library
Display the 7 categories and 19 drugs from approved seed data. Support search, category browsing, PDF availability status, and responsive drug cards/list rows. Do not invent drug descriptions or clinical guidance.

### FR-05 — PDF viewer
Open the original PDF inside the app using a maintained PDF.js-based viewer. Provide page navigation, zoom, fit-to-width, and supported fullscreen behavior. Preserve the original page layout, images, diagrams, and tables as accurately as possible. Record a `pdf_viewed` event when the document opens successfully.

### FR-06 — Multi-select
Allow selecting multiple drugs. Show selected count and actions:
- Compare Selected (requires at least two documents)
- Download Selected PDFs
- Clear Selection

Do not allow missing/inactive PDFs into the downloadable set.

### FR-07 — Side-by-side comparison
Display two original PDFs in independent desktop panes, each with its own page navigation and zoom. On mobile, use tabs or stacked panes. For 3+ selected drugs, ask the user to choose a pair for the active comparison; do not shrink many documents into unreadable columns. Record which drugs were compared.

### FR-08 — Original downloads
Allow individual PDF downloads. For multiple selected documents, create a ZIP containing the original PDFs. Validate all IDs server-side, resolve storage paths from database records, enforce file-count/size/time limits, and use safe filenames. Record the actual successful outcome, not just a button click.

### FR-09 — Combined comparison PDF
From a two-document comparison, provide `Download Combined Comparison PDF`. Generate a new landscape PDF with source page 1 from each document side by side, then source page 2, and so on. If one document has fewer pages, leave its side blank for the remaining pages. Keep original files unchanged. Preserve vector/text content where supported; if rasterization is necessary, use suitable resolution and document the searchability trade-off. Apply size/page/time limits and show processing/error states.

### FR-10 — Activity tracking
Record distinct events:
- `session_started`
- `drug_opened`
- `pdf_viewed`
- `drug_selected` (optional but useful)
- `comparison_opened`
- `pdf_downloaded`
- `zip_downloaded`
- `comparison_pdf_downloaded`

Events include unique event ID, authenticated user/session ID, display-name snapshot, action, related drug ID(s), and server-generated timestamp. Keep technical metadata minimal. Do not collect detailed device fingerprints or IP addresses without a documented need and appropriate notice.

### FR-11 — Admin dashboard
Show real database metrics:
- Research sessions/users
- Category and drug counts
- PDF views
- Individual downloads
- ZIP downloads
- Combined comparison downloads
- Recent activity
- Most viewed/downloaded drugs and trends where useful

Never use hard-coded demo metrics in production.

### FR-12 — Activity explorer
Provide server-paginated activity records with:
- User display name
- Action
- Drug(s)
- Category where applicable
- Date/time
- Download type
- Event/session ID

Filters: date range, user, drug, category, action, and download type. Bulk events must expose all included drug names.

### FR-13 — Excel export
Admins can export filtered activity to `.xlsx`, with user name, action, related drug(s), timestamp, event ID, and download type. Use server-side authorization, bounded exports, and protection against spreadsheet formula injection. An optional summary worksheet may be included.

### FR-14 — Library management
If implemented in v1, admins may manage category/drug metadata and upload/replace PDFs. Validate uploads, audit changes, and expose missing-PDF status. Researchers cannot edit library content.

### FR-15 — PDF ingestion
Implement a working `scripts/upload-drug-pdfs.mjs` and a manifest generator for the local `drugs/` directory. Recursively inspect PDFs, map them to the approved 19 drugs, flag missing/ambiguous/duplicate mappings, upload mapped PDFs to private Storage, verify objects, and update the corresponding database storage paths. Make the workflow repeatable and safe to rerun without overwriting existing files unexpectedly. Never claim success without verification.

## 7. Content and file requirements

- The supplied PDFs are the authoritative documents.
- Keep originals unchanged.
- Store source PDFs in a private Supabase Storage bucket, recommended name: `research-pdfs`.
- Store object paths (not permanent signed URLs) in the database.
- Do not assume local `drugs/` files will be available at Vercel runtime.
- Do not assign a PDF to a drug when the mapping is ambiguous.
- Report missing files rather than substituting unrelated documents.

## 8. Non-functional requirements

- Responsive desktop/tablet/mobile design.
- Keyboard navigation, visible focus, labelled controls, adequate contrast, and accessible status messages.
- Strict TypeScript and validated server inputs.
- Server-side authorization for sensitive operations.
- RLS enabled on application tables.
- Private storage and short-lived signed URLs or protected file endpoints.
- Pagination and indexed activity queries.
- Bounded PDF/ZIP generation to respect Vercel execution limits.
- Useful loading, empty, success, and error states.
- No secrets in client bundles or version control.

## 9. Acceptance criteria

- First screen asks Research User or Admin Login.
- Research user enters a name without email/password and receives a unique identity.
- English works; Hindi/Gujarati are disabled as Coming Soon.
- Exactly 7 categories and 19 drug entries appear when seeded.
- No QR or camera scanner exists.
- Original PDFs open inside the app.
- Two PDFs can be compared side by side on desktop with independent controls.
- User can download one PDF, multiple originals as ZIP, and a combined landscape comparison PDF.
- Viewing and downloading are tracked as separate events.
- Admin can filter activity and export Excel.
- Researchers cannot access admin data or public/private file paths without authorization.
- Ingestion script reports actual uploaded, skipped, missing, ambiguous, and failed files.
- RLS, storage access, and admin authorization tests pass before production release.

## 10. Known limitation

Name-only research entry is convenient but does not verify identity. Admin reports should describe these records as name-based sessions unless stronger researcher authentication is introduced.
