# Folio — architecture

Folio is a free, open-source PDF workspace. The interface uses black, white, neutral grays, generous spacing, fine rules, deliberate typography, and Hugeicons. The working tools are the homepage; there is no marketing gate.

## First release

- Merge multiple PDFs in a chosen order.
- Split a PDF by selecting pages to export.
- Rotate, reorder, and remove pages before downloading a new PDF.
- Preview real pages and show useful progress, errors, and download states.
- Supabase email/password registration, sign-in, password recovery, and sign-out.
- Core PDF tools remain available without an account. Signing in is optional.

Compression, OCR, document editing, cloud file storage, and paid plans are outside this release. They need separate quality and privacy decisions.

## Components

| Layer | Responsibility |
| --- | --- |
| React + TypeScript | Responsive workspace, page controls, accessible account forms |
| Vinext / Vite | Routing, local development, production bundle |
| pdf-lib | Read documents, copy pages, apply rotations, and serialize exports |
| PDF.js | Render actual page thumbnails locally |
| Web Worker | Run PDF export work away from the interface thread |
| Supabase Auth | Email/password identity, sessions, confirmation, and recovery |
| Hugeicons | Consistent outlined interface icons |
| Sites | Web hosting; source also lives in the public furyengi/folio repository |

## Document flow

1. The user chooses or drops PDF files.
2. Validate file signatures and practical size limits; parse documents and report unsupported or encrypted files.
3. Keep file bytes and page selections in browser memory. Each page has a stable identity, source document, original index, and rotation.
4. Render thumbnails locally. Page controls change the selection and order without mutating the source.
5. Send the selected page recipe and document bytes to an export worker.
6. Generate a PDF, offer a browser download, and release temporary object URLs and worker resources.

Document bytes, filenames, thumbnails, and document contents never go to Supabase or the hosting server. Reloading closes the working session. No document analytics or cloud history is collected.

## Authentication boundary

Only the Supabase project URL and publishable key may enter the client bundle. Never commit secrets or a service-role key. Supabase owns password handling and token refresh. Use the auth state subscription to update the interface and unsubscribe on cleanup.

Handle sign-up confirmation, incorrect credentials, recovery redirects, session loading, and sign-out explicitly. Recovery links must return to an allowlisted deployed origin. Do not present a configured sign-in flow as verified until the actual Supabase project is connected and its settings checked.

No application tables or storage buckets are required in the first release. If saved preferences or other account data are added later, enable RLS and owner-specific policies before exposing a table. Never use editable user metadata for authorization.

## Interface

Use an editorial wordmark, a compact header, a clear tool selector, and one large document workspace. Black buttons identify primary actions. Borders and spacing provide hierarchy; avoid gradients, colored accents, decorative blobs, inflated promises, and fake testimonials. Hugeicons are functional cues, not decoration.

All controls have keyboard access and visible focus. Reordering includes button controls rather than relying on dragging. At narrow widths, controls wrap and page previews become a compact grid. Respect reduced-motion preferences.

## Failure handling and limits

Reject unsupported or encrypted documents without bypassing encryption. Set a conservative total input size limit and explain it before processing. Catch parse/export errors, prevent duplicate exports, and allow users to remove files or reset the workspace. Export failures preserve the current selection. Warn that rewriting PDFs can invalidate digital signatures and may not preserve interactive forms or document-level features.

## Repository structure

```text
app/                  Workspace, layout, theme
components/           Account dialog and shared UI primitives
lib/                  Supabase client and document helpers
workers/              PDF export worker
tests/                Document operation tests
public/               Static brand assets
architecture.md       This document
.env.example          Public configuration names only
README.md             Setup, privacy, limitations, contribution guide
LICENSE               MIT license
```

## Validation and delivery

Test merge order, selected-page export, rotation, and invalid input using generated PDF fixtures. Run TypeScript validation and a production build. Verify auth configuration against the connected project; account email delivery requires a real user mailbox and provider settings. Commit lockfiles, document configuration, and publish source under furyengi/folio. Keep deployment configuration reproducible without storing credentials.

## Pending infrastructure choice

GitHub access as furyengi is available. Supabase access is available, but the existing projects belong to other products. A dedicated project should be selected or created with the user's organization and cost confirmation before connecting production authentication.
