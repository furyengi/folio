'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  File01Icon,
  Upload04Icon,
  ArrowUpRight01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  RotateRight01Icon,
  Delete02Icon,
  Download04Icon,
  PlusSignIcon,
  Shield01Icon,
} from '@hugeicons/core-free-icons';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Source, PageRecipe } from '@/lib/pdf';
import Account from '@/components/account';
import Thumbnail from '@/components/thumbnail';
const names = ['Merge PDF', 'Split PDF', 'Organize pages'];
type Document = Source & { preview: PDFDocumentProxy };
export default function Home() {
  const [tool, setTool] = useState(names[0]),
    [docs, setDocs] = useState<Document[]>([]),
    [pages, setPages] = useState<PageRecipe[]>([]),
    [busy, setBusy] = useState(false),
    [exporting, setExporting] = useState(false),
    [message, setMessage] = useState(''),
    [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    documents = useRef<Document[]>([]),
    worker = useRef<Worker | null>(null),
    loading = useRef(false);
  const selected = pages.filter((p) => p.selected).length;
  useEffect(
    () => () => {
      documents.current.forEach((d) => void d.preview.loadingTask.destroy());
      worker.current?.terminate();
    },
    [],
  );
  async function addFiles(files: FileList | File[] | null) {
    if (!files?.length || loading.current || exporting) return;
    loading.current = true;
    setBusy(true);
    setMessage('');
    const additions: Document[] = [];
    try {
      const list = Array.from(files);
      if (
        list.reduce((n, f) => n + f.size, 0) +
          documents.current.reduce((n, d) => n + d.bytes.length, 0) >
        50 * 1024 * 1024
      )
        throw new Error('Choose files totaling 50 MB or less.');
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).href;
      const { PDFDocument } = await import('pdf-lib');
      const nextPages: PageRecipe[] = [];
      for (const file of list) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-'))
          throw new Error(`${file.name} is not a readable PDF.`);
        let parsed;
        try {
          parsed = await PDFDocument.load(bytes);
        } catch {
          throw new Error(
            `${file.name} is encrypted or could not be read. Choose an unlocked PDF.`,
          );
        }
        if (pages.length + nextPages.length + parsed.getPageCount() > 500)
          throw new Error('This workspace supports up to 500 pages at a time.');
        const task = pdfjs.getDocument({ data: bytes.slice() });
        task.onPassword = () => {
          void task.destroy();
        };
        const preview = await task.promise;
        const id = crypto.randomUUID();
        additions.push({ id, name: file.name, bytes, preview });
        for (let index = 0; index < parsed.getPageCount(); index++)
          nextPages.push({
            id: crypto.randomUUID(),
            sourceId: id,
            index,
            rotation: 0,
            selected: true,
          });
      }
      documents.current = [...documents.current, ...additions];
      setDocs(documents.current);
      setPages((p) => [...p, ...nextPages]);
    } catch (error) {
      additions.forEach((d) => void d.preview.loadingTask.destroy());
      setMessage(
        error instanceof Error ? error.message : 'Could not open these files.',
      );
    } finally {
      loading.current = false;
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  function reset() {
    documents.current.forEach((d) => void d.preview.loadingTask.destroy());
    documents.current = [];
    setDocs([]);
    setPages([]);
    setMessage('');
  }
  function move(index: number, delta: number) {
    setPages((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  function removeDoc(id: string) {
    const doc = documents.current.find((d) => d.id === id);
    void doc?.preview.loadingTask.destroy();
    documents.current = documents.current.filter((d) => d.id !== id);
    setDocs(documents.current);
    setPages((p) => p.filter((x) => x.sourceId !== id));
    setMessage('');
  }
  function download() {
    if (!selected || busy || exporting) return;
    setExporting(true);
    setMessage('');
    const job = new Worker(
      new URL('../workers/pdf.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.current = job;
    const timeout = setTimeout(() => {
      job.terminate();
      setExporting(false);
      setMessage('Export took too long. Try fewer pages.');
    }, 120000);
    const finish = () => {
      clearTimeout(timeout);
      job.terminate();
      worker.current = null;
      setExporting(false);
    };
    job.onmessage = (event) => {
      if (event.data.error) {
        setMessage(event.data.error);
        finish();
        return;
      }
      const url = URL.createObjectURL(
        new Blob([event.data.bytes], { type: 'application/pdf' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download =
        tool === 'Merge PDF'
          ? 'folio-merged.pdf'
          : tool === 'Split PDF'
            ? 'folio-selected-pages.pdf'
            : 'folio-organized.pdf';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage('Your PDF is ready. Download started.');
      finish();
    };
    job.onerror = () => {
      setMessage(
        'Could not export this PDF. Try fewer pages or a different file.',
      );
      finish();
    };
    job.postMessage({
      sources: docs.map(({ id, name, bytes }) => ({ id, name, bytes })),
      pages,
    });
  }
  return (
    <div className="folio-app">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Folio home">
          folio<span> /</span>
        </Link>
        <span className="header-caption">THE PDF WORKSPACE</span>
        <nav>
          <a
            href="https://github.com/furyengi/folio"
            target="_blank"
            rel="noreferrer"
          >
            Source code <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} />
          </a>
          <Account />
        </nav>
      </header>
      <main className="workspace">
        <div className="intro">
          <p className="eyebrow">YOUR DOCUMENTS. YOUR DEVICE.</p>
          <h1>
            A little order.
            <br />
            <span>A lot less effort.</span>
          </h1>
          <p>
            Merge, split, and arrange your PDFs.
            <br />
            Free to use. Your files stay with you.
          </p>
        </div>
        <input
          ref={input}
          type="file"
          hidden
          accept="application/pdf,.pdf"
          multiple
          onChange={(e) => void addFiles(e.target.files)}
        />
        <Tabs
          value={tool}
          onValueChange={(v) => {
            setTool(String(v));
            setMessage('');
          }}
        >
          <TabsList className="tool-tabs" variant="line">
            {names.map((name, i) => (
              <TabsTrigger key={name} value={name} disabled={exporting || busy}>
                <span className="tool-number">0{i + 1}</span>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          {names.map((name) => (
            <TabsContent key={name} value={name}>
              {/* File drop supplements the keyboard-accessible file picker. */}
              {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <section
                aria-label="PDF workspace"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setDrag(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  void addFiles(e.dataTransfer.files);
                }}
                className={drag ? 'dragging' : ''}
              >
                {!pages.length ? (
                  <div className="drop-area">
                    <HugeiconsIcon
                      icon={File01Icon}
                      size={42}
                      strokeWidth={1}
                    />
                    <h2>
                      {name === 'Merge PDF'
                        ? 'Bring your PDFs together.'
                        : name === 'Split PDF'
                          ? 'Keep only what you need.'
                          : 'Every page in its place.'}
                    </h2>
                    <p>Drop your files here, or choose them below.</p>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => input.current?.click()}
                    >
                      {busy ? 'Opening PDFs…' : 'Choose PDF files'}
                      <HugeiconsIcon icon={Upload04Icon} size={19} />
                    </button>
                    <small>PDF files · 50 MB total · Up to 500 pages</small>
                  </div>
                ) : (
                  <div className="editor">
                    <div className="editor-toolbar">
                      <div>
                        <strong>
                          {docs.length}{' '}
                          {docs.length === 1 ? 'document' : 'documents'}
                        </strong>
                        <span>
                          {selected} of {pages.length} pages selected
                        </span>
                      </div>
                      <div className="toolbar-actions">
                        <button
                          className="button quiet"
                          disabled={busy || exporting}
                          onClick={() => input.current?.click()}
                        >
                          <HugeiconsIcon icon={PlusSignIcon} size={16} />
                          {busy ? 'Opening…' : 'Add files'}
                        </button>
                        <button
                          className="text-button"
                          disabled={busy || exporting}
                          onClick={reset}
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                    <div className="source-list">
                      {docs.map((doc) => (
                        <div className="source-chip" key={doc.id}>
                          <HugeiconsIcon icon={File01Icon} size={16} />
                          <span title={doc.name}>{doc.name}</span>
                          <button
                            aria-label={`Remove ${doc.name}`}
                            disabled={busy || exporting}
                            onClick={() => removeDoc(doc.id)}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="selection-row">
                      <span>
                        {name === 'Split PDF'
                          ? 'Select the pages to save as a new PDF.'
                          : 'Select, rotate, and arrange pages in the order you want.'}
                      </span>
                      <button
                        className="text-button"
                        disabled={exporting || busy}
                        onClick={() =>
                          setPages((p) =>
                            p.map((x) => ({
                              ...x,
                              selected: selected !== pages.length,
                            })),
                          )
                        }
                      >
                        {selected === pages.length
                          ? 'Deselect all'
                          : 'Select all'}
                      </button>
                    </div>
                    <div className="page-grid">
                      {pages.map((page, index) => {
                        const doc = docs.find((d) => d.id === page.sourceId)!;
                        return (
                          <article
                            className={`page-card ${page.selected ? '' : 'unselected'}`}
                            key={page.id}
                          >
                            <div className="page-card-top">
                              <label>
                                <Checkbox
                                  checked={page.selected}
                                  disabled={exporting || busy}
                                  onCheckedChange={(value) =>
                                    setPages((p) =>
                                      p.map((x) =>
                                        x.id === page.id
                                          ? { ...x, selected: Boolean(value) }
                                          : x,
                                      ),
                                    )
                                  }
                                  aria-label={`Include page ${page.index + 1} from ${doc.name}`}
                                />
                                <span>
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                              </label>
                              <span className="page-origin" title={doc.name}>
                                {doc.name}
                              </span>
                            </div>
                            <Thumbnail
                              doc={doc.preview}
                              index={page.index}
                              rotation={page.rotation}
                            />
                            <div className="page-controls">
                              <span>Page {page.index + 1}</span>
                              <button
                                disabled={index === 0 || exporting || busy}
                                onClick={() => move(index, -1)}
                                aria-label={`Move output page ${index + 1} earlier`}
                              >
                                <HugeiconsIcon
                                  icon={ArrowLeft01Icon}
                                  size={18}
                                />
                              </button>
                              <button
                                disabled={
                                  index === pages.length - 1 ||
                                  exporting ||
                                  busy
                                }
                                onClick={() => move(index, 1)}
                                aria-label={`Move output page ${index + 1} later`}
                              >
                                <HugeiconsIcon
                                  icon={ArrowRight01Icon}
                                  size={18}
                                />
                              </button>
                              <button
                                disabled={exporting || busy}
                                onClick={() =>
                                  setPages((p) =>
                                    p.map((x) =>
                                      x.id === page.id
                                        ? {
                                            ...x,
                                            rotation: (x.rotation + 90) % 360,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                aria-label={`Rotate output page ${index + 1}`}
                              >
                                <HugeiconsIcon
                                  icon={RotateRight01Icon}
                                  size={18}
                                />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <div className="export-bar">
                      <p>
                        Original files stay unchanged.
                        <small>
                          Digital signatures and interactive forms may not be
                          preserved.
                        </small>
                      </p>
                      <button
                        className="button primary"
                        disabled={!selected || busy || exporting}
                        onClick={download}
                      >
                        {exporting
                          ? 'Preparing PDF…'
                          : name === 'Merge PDF'
                            ? 'Merge & download'
                            : 'Download selected pages'}
                        <HugeiconsIcon icon={Download04Icon} size={19} />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </TabsContent>
          ))}
        </Tabs>
        {message && <output className="notice">{message}</output>}
        <div className="workspace-notes">
          <span>
            <HugeiconsIcon icon={Shield01Icon} size={15} /> Files stay in your
            browser
          </span>
          <span>No watermarks. No usage fees.</span>
          <span>Open source, always</span>
        </div>
      </main>
      <footer>
        <Link className="wordmark small" href="/">
          folio
        </Link>
        <span>Good tools should be for everyone.</span>
        <a href="https://github.com/furyengi/folio/blob/main/LICENSE">
          MIT licensed ↗
        </a>
      </footer>
    </div>
  );
}
