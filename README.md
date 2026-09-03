# Folio

A free, open-source PDF workspace. Merge documents, extract selected pages, rotate, and reorder pages without uploading files.

## Privacy

PDF bytes, filenames, and previews stay in browser memory. Refreshing closes the workspace. Supabase receives account credentials when signing in; it never receives documents. There are no analytics, document uploads, watermarks, or usage fees.

## Development

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Core tools work without Supabase configuration. For accounts, fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using a Supabase project you own. Never use a secret or service-role key in these fields. Enable email/password authentication and add the deployed origin and local development origin to Supabase's allowed redirect URLs. Set the Site URL to the deployed origin. Configure production SMTP before opening registration to the public; the default Supabase email sender has restrictions.

The client handles confirmation callbacks, password recovery, and sign-out on the homepage. Without configuration it clearly reports that accounts are unavailable. No application tables, migrations, or storage buckets are required.

## Commands

```sh
npm run test
npm run typecheck
npm run build
```

The Sites deployment manifest is `.openai/hosting.json`. Forks should remove the original `project_id` and register their own deployment. For self-hosting, use the generated Cloudflare Worker build or adapt the host integration. Supabase remains optional for document tools.

## Limits

- 50 MB total input and 500 pages per workspace.
- Encrypted PDFs are rejected; unlock them using their password in a trusted tool first.
- Rewriting documents can invalidate digital signatures and may not preserve forms, bookmarks, attachments, and document-level metadata.
- Split exports selected pages as one new PDF, rather than creating a ZIP of individual files.
- Compression, OCR, text editing, and cloud document storage are not included.
- Large or unusually complex documents may exceed browser memory even within the size limit.

## Architecture and contribution

Read [architecture.md](architecture.md) before proposing structural changes. Keep document processing local and accessible controls usable by keyboard. Add fixture-based tests for changes to export behavior. Report reproducible bugs through GitHub Issues without attaching confidential PDFs.

## License

MIT. Bundled dependencies retain their own licenses, including the Hugeicons free icon package.
