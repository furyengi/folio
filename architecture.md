# Folio — architecture

Status: revised product architecture, 4 September 2026. This document defines the target product and release sequence. It does not claim that planned capabilities are implemented.

## Product direction

Folio is a free, open-source document editor with a complete PDF toolkit. A Word-style editing experience is the core: open the app, create or open a document, and work directly on pages. PDF utilities are integrated into that workspace rather than serving as the homepage.

The visual direction remains black, white, and neutral gray with Hugeicons, deliberate typography, fine borders, and restrained spacing. No decorative marketing screen between the user and their document. UI colors are monochrome; imported images and document content retain their original colors.

The goal is broad PDF-tool coverage, not a claim of immediate feature parity with Microsoft Word, Adobe Acrobat, or iLovePDF.

## What exists today

- Browser-based PDF merge, selected-page extraction, rotation, ordering, and page previews.
- Local PDF export through a worker, with fixture-based operation tests.
- Supabase account forms and client configuration, not connected to a live project.
- Public MIT-licensed source at https://github.com/furyengi/folio.

The current app does not have a rich-text editor, DOCX support, persistent documents, OCR, compression, or cloud document storage. Its existing PDF modules should be reused inside the new workspace.

## Workspace and navigation

The first screen opens an untitled editable document. A compact File menu provides New, Open, Recent, Rename, Save a copy, Download, and Print. Returning users may restore their last local draft, with an obvious New action.

```text
Document title          Saving status                  Account
File | Home | Insert | Layout | Review | PDF Tools | Export
Context-sensitive ribbon: commands for the active tab
----------------------------------------------------------
Outline / pages  |  Editable document or PDF  |  Properties
                 |  Centered pages, zoom      |  When needed
----------------------------------------------------------
Page / word count         Editing mode             Zoom
```

Document tabs support switching between open files; ribbon tabs select command groups. They are different controls with distinct keyboard behavior. The right properties panel appears only when relevant. A PDF stays inside the same workspace, with PDF-specific commands and a visible Convert to editable document action.

| Ribbon    | Commands                                                                              |
| --------- | ------------------------------------------------------------------------------------- |
| Home      | Undo/redo, clipboard, styles, font, emphasis, alignment, lists, spacing, find/replace |
| Insert    | Tables, images, links, breaks, headers, footers, page numbers                         |
| Layout    | Paper size, orientation, margins, indentation, page and section layout                |
| Review    | Comments, spelling assistance, word count; tracked changes in a later release         |
| PDF Tools | Organize, convert, annotate, forms, optimize, protect, and compare                    |
| Export    | Editable file, PDF, images, plain text, Markdown, and print as supported              |

On small screens, the ribbon condenses into labeled command groups and side panels become drawers. Keyboard focus, selection preservation when clicking ribbon controls, shortcuts, screen-reader labels, and reduced-motion support are acceptance requirements. There must be no decorative or nonfunctional toolbar commands in released builds.

## Two document models

### Editable document

A versioned structured document tree is the source of truth. It represents paragraphs, text marks, lists, tables, images, breaks, and layout settings. Persist semantic content and asset references, not raw editor DOM or a screenshot of each page.

The editor owns selection, transactions, undo/redo, and composition. A layout layer calculates page boundaries from content, available width, fonts, and explicit breaks. Page boundaries are derived presentation data; typing across a boundary must not corrupt lists, tables, or the undo history. Complex objects, table splitting, headers/footers, and font substitution require dedicated fixtures.

### Fixed-layout PDF

Preserve the original PDF as an immutable source. Keep page order, selection, rotations, annotations, and form changes in a separate operation model. PDF.js provides viewing; PDF operations produce a new output. Text selection in a PDF is not equivalent to editing a paragraph in a document editor.

### Converting between the two

Opening a PDF initially uses the fixed-layout viewer. Conversion creates a separate editable copy, preserving the original and reporting unsupported elements. Scans require OCR; extracted text then needs reading-order and layout reconstruction. Do not promise exact reconstruction of columns, tables, equations, fonts, or floating objects.

Native documents export through the editable model. Exporting a PDF does not replace that model, so the user can continue editing afterward. Re-importing an exported PDF is a conversion, not lossless native reopening.

## Module boundaries and technology decisions

| Module              | Responsibility and decision                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace shell     | Existing React/TypeScript and Vinext/Vite; shared commands, menus, panels, and document tabs                                             |
| Editor adapter      | Encapsulate the structured editing engine, schema, selection, and transactions; choose an open-source engine through the Release 1 spike |
| Layout engine       | Page flow, breaks, measurements, headers/footers, and print layout, independently tested                                                 |
| PDF viewer          | Existing PDF.js integration, local rendering, search, thumbnails, and zoom                                                               |
| PDF operations      | Existing pdf-lib adapter for supported mutations; separate engines for capabilities it cannot provide                                    |
| Export adapters     | Convert the canonical document model to supported formats without coupling the editor to a converter                                     |
| Local persistence   | IndexedDB snapshots and assets, schema migration, recovery, and explicit deletion                                                        |
| Cloud persistence   | Optional Supabase Auth, Postgres metadata, and private object storage                                                                    |
| Job API and workers | Isolated conversion, OCR, repair, encryption, and other expensive operations                                                             |
| UI system           | Existing accessible primitives styled in monochrome; Hugeicons for product controls                                                      |

Engine selection is an implementation gate, not a settled dependency claim. Evaluate an open-source structured editor such as ProseMirror/Tiptap or Lexical against pagination, tables, IME, accessibility, and export requirements. Paid editor extensions must not be an undisclosed dependency. Verify current APIs and licenses before choosing packages.

Existing Sites hosting serves the web application. Large native converters require a separate sandboxed worker service; do not assume they fit inside the web host's runtime. Evaluate engines such as LibreOffice, qpdf, and Tesseract for their specific jobs, with current compatibility, license, and fidelity checks before adoption. PDF-to-Office reconstruction remains a separate engineering problem.

## Persistence and authentication

Anonymous users can create documents and use local tools. Autosave stores drafts on their device and displays Saving, Saved on this device, or Save failed truthfully. Browser storage can be cleared or evicted, so downloadable backups must remain available.

Signing in enables optional cloud saving. Never automatically upload existing local drafts after sign-in. The user chooses Save to account, sees that the document will be uploaded, and can keep working locally instead.

Proposed records:

- documents: id, owner_id, title, kind, schema_version, current_revision, created_at, updated_at.
- document_revisions: id, document_id, revision_number, private_object_key, content_hash, created_at.
- document_assets: id, document_id, owner_id, private_object_key, media_type, size_bytes.
- conversion_jobs: id, owner_id, operation, state, input_key, output_key, expires_at, safe_error_code.

Use immutable snapshots with an atomic revision-pointer update. Save requests include their base revision; a conflict creates a recoverable copy or asks for resolution rather than silently overwriting another session. Local dirty content survives a failed network save. Multiuser live collaboration is a later capability, not implied by cloud autosave.

Enable RLS on every exposed table. Policies validate ownership through auth.uid(); child records inherit access from their parent document. Storage buckets are private with owner-scoped paths and short-lived authorized download URLs. Never authorize using editable user metadata. Only the project URL and publishable key enter browser code; privileged keys remain server-side.

Sign-up confirmation, recovery, session expiration, sign-out, account deletion, document deletion, and failed email delivery need explicit flows. Signing out removes in-memory cloud credentials and sensitive cloud caches while preserving local work only when the user chooses to keep it. Account deletion requires deliberate confirmation and removal of associated data.

## Processing and privacy boundaries

Local operations are preferred and need no upload: editing, basic PDF organization, image assembly, and feasible annotation/export operations. Off-device processing is explicit per job, with the operation, destination, retention, and upload size shown before submission.

A cloud conversion runs in an isolated, resource-limited worker with no arbitrary network access. Upload validation checks content as well as extension. Workers enforce time, memory, page, and decompression limits. Inputs and outputs have documented expiry and deletion rules; cleanup failures are retried and monitored. Job status contains no document text. Retries use idempotency keys and never produce duplicate user-visible jobs.

User-provided HTML and imported rich text are sanitized. URL-to-PDF conversion requires SSRF defenses and must not fetch private network addresses. Macros, embedded scripts, external document resources, and uploaded programs are never executed.

Cloud storage and conversion change the original privacy claim. The product may say an operation stays on-device only when it actually does. Free software and free local use do not imply unlimited free hosted compute; quotas must be disclosed without hiding basic local tools behind payment.

## Release plan and acceptance gates

### Release 1 — the editor is the product

- Replace the utility homepage with the document workspace and working ribbon.
- New/open native documents; text entry, formatting, headings, paragraphs, lists, links, images, tables, find/replace, undo/redo, and word count.
- A4/Letter, margins, orientation, explicit page breaks, zoom, and reliable page flow for the supported content subset.
- Local autosave, recovery after reload, rename, native download/reopen, and PDF output; print-to-PDF must be labeled as such if used initially.
- Open PDFs in the same shell, retaining existing merge, extract, rotate, and reorder behavior.
- Deliver a tested editor-engine and pagination spike before expanding the ribbon. Fonts, long paragraphs, lists, and multi-page tables must survive editing and reopen/export.

Exit gate: a user can write a multi-page document, insert an image and table, close/reopen it, continue editing, and export readable pages without losing content. Existing PDF tests still pass. No cloud dependency is required for this local release.

### Release 2 — accounts and everyday document exchange

- Connect Supabase; optional cloud documents, revision saves, conflict handling, deletion, and recovery.
- DOCX import/export for an explicitly supported formatting subset, with warnings for unsupported content.
- Headers, footers, numbering, comments, expanded page layout, and browser spelling assistance.
- PDF annotation, image/text overlays, form filling, visual signatures, watermarking, page numbering, cropping, and image conversion.

Exit gate: supported DOCX fixtures survive round trips; annotations and forms appear in exported PDFs; owner isolation is tested with two accounts; failed saves preserve drafts. A drawn signature is labeled as a visual signature, not certificate-backed signing.

### Release 3 — conversion and optimization

- Sandboxed job service, upload consent, progress, cancellation, retries, expiry, and quotas.
- Compression with quality choices, OCR with searchable output, repair attempts, and scanned-document capture.
- Office-to-PDF and HTML-to-PDF; PDF-to-editable-document, spreadsheet, presentation, and Markdown adapters as fidelity gates are met.
- Password protection and removal with the required authorization/password; no password cracking.

Exit gate: a published fixture corpus measures text accuracy, layout, table structure, size reduction, and failure behavior. No blank conversion, image-only Word file, or destructive rasterization is presented as fully editable output. Unrecoverable files fail honestly.

### Release 4 — advanced PDF and review tools

- Permanent redaction, PDF/A generation and independent validation, visual/text comparison, and form creation.
- Tracked changes, reusable batch workflows, and accessible document/export improvements.
- Certificate-backed signing and signature-request workflows only after identity, audit, delivery, and verification requirements are designed.

Exit gate: redacted content cannot be recovered through text extraction, annotations, metadata, or embedded objects; a black overlay never counts as redaction. Archival output passes the selected PDF/A profile validator. Existing signatures are never silently represented as valid after modification.

### Later product extensions

Real-time collaboration, desktop distribution, dedicated mobile apps, AI summarization, and document translation need separate designs. AI features are recorded in the coverage matrix because the reference product now lists them; their inclusion does not override the user's request for a clean, non-generic interface. No paid model service or external document transfer is assumed.

## Reference feature coverage

Reference inventory checked on 4 September 2026: [iLovePDF tools](https://www.ilovepdf.com/). This inventory is a planning reference, not an implementation or parity claim. The surrounding editor, storage, and release decisions are Folio's own design.

| Reference capability                                      | Folio target                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Merge, split, extract, remove, organize, rotate           | Existing foundation; integrated in Release 1                    |
| Edit, watermark, number, crop, fill forms, visual signing | Release 2                                                       |
| PDF/image conversion                                      | Release 2                                                       |
| Compression, repair, OCR, scanning                        | Release 3                                                       |
| Word, PowerPoint, Excel, HTML to PDF                      | Release 3; basic DOCX exchange begins in Release 2              |
| PDF to Word, PowerPoint, Excel, Markdown                  | Release 3, gated by conversion quality                          |
| Unlock and protect                                        | Release 3                                                       |
| PDF/A, redact, compare, create forms                      | Release 4                                                       |
| Signature requests and reusable workflows                 | Release 4, following service design                             |
| Summarization and translation                             | Later extensions; provider, cost, and privacy decisions pending |

## Target repository structure

```text
app/                     Workspace routes and theme
components/workspace/    Ribbon, menus, tabs, navigation, status
components/editor/       Editing surface and contextual properties
components/pdf/          Viewer and PDF controls
lib/documents/           Schema, commands, revisions, import/export contracts
lib/persistence/         Local and cloud adapters
lib/pdf/                 Existing operations, extracted as the app grows
workers/                 Browser parsing, rendering, and export work
services/conversion/     Separate isolated job service, introduced in Release 3
supabase/                Reviewed schema and storage policies, when introduced
tests/                   Document, PDF, persistence, and security fixtures
architecture.md          Target architecture and status
```

This is the target structure, not a description of directories already created. Split modules when their responsibilities are implemented; do not scaffold empty services just to match the diagram.

## Validation strategy

Use fixture-based tests for document transactions, pagination boundaries, import/export, PDF mutations, migrations, interrupted saves, and conflicts. Check keyboard selection and ribbon interaction, IME input, mobile layout, and screen-reader labels. Compare rendered exports to representative originals and inspect text/structure as well as pixels. Browser interaction testing belongs to the implementation acceptance work, subject to the user's testing instructions.

Require ownership tests before cloud persistence, sandbox/cleanup tests before conversion jobs, irreversible-content-removal tests before redaction, and independent output validation before archival/signature claims. A successful build alone is not proof that a document editor or converter works.

## Current blockers and next implementation step

Supabase project creation in the selected evnar organization was quoted at $0/month but refused because the account reached its free-project limit. Existing projects must not be reused or paused without the user's explicit choice. Hosted preview upload failed, and the Sites connector was subsequently unavailable in the session; the public GitHub source is intact.

The next implementation milestone is Release 1's editor-engine and pagination spike, followed by the working document shell. It does not require resolving Supabase or purchasing services. This architecture revision changes documentation only; implementation should follow as a separate step from the user's clarification request.

## Implementation checkpoint — 4 September 2026

The editor foundation now exists: open document tabs, editable titles, Tiptap rich text and tables, images, links, outline, find/replace, local IndexedDB autosave, native JSON/text import/export, paper settings, and print-to-PDF. The original PDF utilities are integrated in a separate workspace mode. Tests exercise native round trips, schema rejection, safe imports, text transactions, and existing PDF transforms.

Release 1 remains incomplete: the current canvas is continuous, with explicit breaks and automatic pagination at print time. On-screen pagination, browser interaction acceptance, and multi-page table/layout fidelity still require work. Cloud authentication/storage, DOCX, and advanced PDF conversions are not implemented by this checkpoint. The current UI and README describe these boundaries; no feature parity claim is made.
