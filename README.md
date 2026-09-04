# Folio

An open-source document editor with a PDF workspace. Write and format documents locally, then switch to PDF tools without closing your drafts.

## Available now

- Document tabs, editable titles, and local autosave/recovery using IndexedDB.
- Rich text: headings, fonts, sizes, bold, italic, underline, lists, alignment, spacing, links, and undo/redo.
- Images, editable tables, explicit page breaks, document outline, find/replace, and word count.
- A4/Letter, orientation, margins, zoom, and browser print-to-PDF.
- Download/reopen `.folio.json` files and import/export plain text.
- PDF merge, extraction, rotation, ordering, and real page previews.
- Supabase account forms, awaiting a configured project.

## Current boundaries

The editor uses a continuous canvas. Explicit page breaks and automatic print pagination apply in the print dialog; Word-style on-screen pagination is not implemented yet. DOCX import/export, OCR, compression, direct rewriting of original PDF text, comments, cloud documents, and advanced conversions remain in the architecture roadmap. PDF files open in PDF tools, not as editable paragraphs.

Drafts persist on this browser/device. Download editable backups: browser storage can be cleared, unavailable, or evicted. Document tabs preserve undo history during the current session; history is not restored after a browser reload. Autosave is debounced and reports pending/failed saves. Editing the same workspace in multiple browser windows is not yet supported. A maximum of 12 local drafts is currently supported; removing a draft requires confirmation.

Native imports are limited to 10 MB and embedded images to 3 MB each. Use modest image sizes to keep editable backups within the import limit. PDF tools accept 50 MB total and 500 pages per workspace. Encrypted PDFs are rejected. PDF rewriting can invalidate signatures and may not preserve forms, bookmarks, attachments, or metadata.

## Privacy

Documents, filenames, and previews remain on your device. Local drafts use IndexedDB. There is no document upload, cloud history, or analytics. Supabase receives account credentials only when configured and used; it never receives documents in this version. Future cloud saves and conversions require explicit upload choices.

## Development

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
npm run test
npm run typecheck
npm run build
```

Core tools work without Supabase. To enable accounts, configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never expose secret or service-role keys. Enable email/password authentication, allowlist local and deployed redirect origins, set the Site URL, and configure production SMTP. No application tables or storage buckets are needed for this local release.

The Sites deployment manifest is `.openai/hosting.json`. Forks must replace the original project registration with their own. The output targets Cloudflare Workers; native conversion services in later releases require a separate runtime.

## Architecture and contributions

Read [architecture.md](architecture.md) for the editor-first architecture and release matrix. Keep processing local, use accessible controls, and add meaningful document fixtures when changing transformations or storage. Report reproducible issues without attaching confidential files.

The editing engine uses the open-source Tiptap core and extensions. No paid Tiptap Pages or conversion service is required. PDF operations use pdf-lib and PDF.js. Interface icons use Hugeicons.

## License

MIT. Dependencies retain their own licenses.
