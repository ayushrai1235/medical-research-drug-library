# Medical Research Drug Library — Design Specification

**Version:** 1.1  
**Visual direction:** Minimal, professional, accessible, research-focused

## 1. Design principles

- Calm, trustworthy medical research interface.
- Prioritize reading the supplied PDF documents.
- Clear separation between Research User and Admin Login.
- Responsive layouts with readable document controls.
- No invented medicine information or hard-coded analytics.
- Avoid excessive gradients, heavy shadows, decorative animation, or generic AI-dashboard styling.

## 2. Visual system

- Primary: deep medical blue.
- Accent: muted teal.
- Background: very light neutral.
- Surfaces: white with subtle borders.
- Text: high-contrast charcoal and slate.
- Typography: Geist or Inter, with readable line heights.
- Use shadcn/ui and Lucide icons consistently.
- Show visible keyboard focus, accessible labels, and clear disabled states.
- Aim for WCAG AA contrast.

## 3. Main routes

- `/` — choose Research User or Admin Login.
- `/research-entry` — name and language.
- `/library` — category navigation, search, selection.
- `/drugs/[slug]` — drug information and PDF viewer.
- `/compare` — side-by-side PDF comparison.
- `/admin-login` — administrator authentication.
- `/admin/dashboard` — real metrics.
- `/admin/activity` — activity explorer and filters.
- `/admin/categories` and `/admin/drugs` — management if enabled.
- `/admin/exports` — Excel export.

All admin routes require server-verified authorization.

## 4. Screen requirements

### Landing page
- Heading: “Medical Research Library”.
- Supporting line: “Access research documents and drug information.”
- Two equally clear actions:
  - Continue as Research User.
  - Admin Login.
- Use organization branding only when provided.

### Research entry
- Required display name.
- Language options:
  - English — enabled and selected by default.
  - Hindi — disabled, Coming Soon.
  - Gujarati — disabled, Coming Soon.
- Primary button: Enter Library.
- No researcher email/password form in v1.
- Briefly explain that the display name is not identity verification.

### Library
- Header with app name, display name, language, and End Session.
- Sidebar or responsive category navigation for the 7 categories.
- Search input and result count.
- Cards/list rows with drug name, category, PDF status, View PDF, and selection checkbox.
- Selection toolbar:
  - Compare Selected (requires at least two).
  - Download Selected PDFs.
  - Clear Selection.
- Use only approved drug names and verified metadata.

### PDF viewer
- Breadcrumbs and drug title.
- PDF viewer as the main content.
- Page navigation, zoom, fit-to-width, fullscreen where supported.
- Actions: Download PDF and Add to Comparison.
- Loading, unavailable-file, and retry states.
- Preserve original page content and layout.

### Comparison view
- Desktop: two equal-width PDF panes, drug title above each, independent page/zoom controls.
- Mobile: tabs or stacked panes; never shrink documents to unreadable widths.
- Actions: Download Combined Comparison PDF, Download Originals as ZIP, Change Selection.
- For more than two selected drugs, let the user select the active pair.
- Clearly distinguish combined comparison output from original files.

### Admin login
- Email and password fields.
- Show/hide password control.
- Sign-in button and loading/error states.
- No public admin registration.
- Redirect only after server-side role verification.

### Admin dashboard
- Metric cards: research sessions, drug records, PDF views, individual downloads, ZIP downloads, combined comparison downloads.
- Recent activity table.
- Useful trends and most viewed/downloaded drugs.
- All metrics must use real Supabase data.

### Admin activity
- Columns: display name, action, drug(s), category, timestamp, download type, event/session ID.
- Search and filters for date range, user, drug, category, action, and download type.
- Server-side pagination.
- Expandable details for bulk download events.
- Export filtered records to Excel.

### Library management
- Category/drug table and PDF status.
- Upload/replace PDF with validation and progress.
- Confirm destructive changes.
- Show missing/ambiguous mapping status.
- Audit admin changes.

## 5. Interaction states

- Every button must perform its advertised action.
- Use skeletons while loading.
- Use inline validation for form errors and toasts for completed actions.
- Do not show success until the server confirms it.
- Explain disabled actions.
- Show processing and recoverable error states for ZIP/combined PDF generation.
- Track successful viewing/download outcomes rather than button clicks.

## 6. Responsive behavior

- Desktop: category sidebar, two-column comparison, wide admin tables.
- Tablet: collapsible navigation and readable comparison panes.
- Mobile: stacked cards, drawer/horizontal category filter, comparison tabs/stacked panes, responsive tables.
- Keep controls reachable without obscuring the PDF content.

## 7. Accessibility

- Keyboard navigation and visible focus.
- Visible labels and accessible validation.
- Dialog focus management.
- ARIA labels for icon-only controls.
- Do not communicate status by color alone.
- Respect reduced motion.
- Provide accessible error/loading messages.
- Provide an alternate open/download option if the PDF viewer has screen-reader limitations.

## 8. Approved library content

1. Biguanides: Metformin
2. DPP-4 Inhibitors: Sitagliptin, Vildagliptin, Linagliptin, Saxagliptin
3. TZDs (Thiazolidinediones): Pioglitazone
4. Sulfonylureas: Glimepiride, Glipizide, Glibenclamide, Gliclazide
5. Alpha-glucosidase Inhibitors: Acarbose, Miglitol, Voglibose
6. SGLT-2 Inhibitors: Empagliflozin, Canagliflozin, Dapagliflozin
7. Non-Sulphonylureas (project-provided grouping): Nateglinide, Repaglinide, Semaglutide

Preserve the supplied grouping and spelling. Do not invent descriptions or medical advice.

## 9. Design acceptance checklist

- Role selection is the first screen.
- Research entry uses name and language only.
- English active; Hindi/Gujarati Coming Soon.
- 7 categories and 19 drugs display correctly.
- No QR/camera scanner.
- Original PDFs render in-app.
- Two PDFs compare side by side on desktop.
- Mobile comparison remains readable.
- Individual, ZIP, and combined PDF downloads are distinct.
- Admin can trace who viewed/downloaded which drugs and when.
- Activity filtering and Excel export work.
- Missing PDFs and ingestion errors are visible to admins.
- No mock metrics or invented drug data ship to production.
