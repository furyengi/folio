'use client';
import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  File01Icon,
  PlusSignIcon,
  Cancel01Icon,
  ArrowUpRight01Icon,
} from '@hugeicons/core-free-icons';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import Account from '@/components/account';
import DocumentEditor from '@/components/editor/document-editor';
import PdfWorkspace from '@/components/pdf-workspace';
import {
  newDocument,
  validateDocument,
  type FolioDocument,
} from '@/lib/documents/model';
import { checkDocumentSchema } from '@/lib/documents/schema';
import { loadWorkspace, saveWorkspace } from '@/lib/documents/storage';
export default function Home() {
  const [documents, setDocuments] = useState<FolioDocument[]>([]),
    [active, setActive] = useState(''),
    [mode, setMode] = useState('write'),
    [ready, setReady] = useState(false),
    [saveStatus, setSaveStatus] = useState('Opening drafts…'),
    [notice, setNotice] = useState(''),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null),
    canSave = useRef(true),
    dirty = useRef(false),
    saveSequence = useRef(0);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const snapshot = await loadWorkspace();
        if (!alive) return;
        if (snapshot?.documents?.length) {
          if (snapshot.documents.length > 12)
            throw new Error('Too many drafts');
          const checked = snapshot.documents.map((doc) => ({
            ...validateDocument(doc),
            id: doc.id,
          }));
          checked.forEach((doc) => checkDocumentSchema(doc.content));
          setDocuments(checked);
          setActive(
            checked.some((d) => d.id === snapshot.activeId)
              ? snapshot.activeId
              : checked[0].id,
          );
        } else {
          const doc = newDocument();
          setDocuments([doc]);
          setActive(doc.id);
        }
      } catch {
        if (!alive) return;
        canSave.current = false;
        const doc = newDocument();
        setDocuments([doc]);
        setActive(doc.id);
        setNotice(
          'Could not restore local drafts. Existing storage has not been overwritten. Download your work to keep a copy.',
        );
        setSaveStatus('Autosave unavailable');
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !canSave.current || !documents.length) return;
    dirty.current = true;
    setSaveStatus('Saving…');
    const sequence = ++saveSequence.current;
    const timeout = setTimeout(() => {
      void saveWorkspace({ documents, activeId: active })
        .then(() => {
          if (sequence === saveSequence.current) {
            dirty.current = false;
            setSaveStatus('Saved on this device');
          }
        })
        .catch(() => {
          if (sequence === saveSequence.current)
            setSaveStatus('Save failed — download a copy');
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [documents, active, ready]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        // Retained for browsers that require returnValue to protect unsaved work.
        // oxlint-disable-next-line typescript/no-deprecated
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  function addDocument(doc = newDocument()) {
    if (documents.length >= 12) {
      setNotice(
        'You have 12 drafts open. Download and remove a draft before creating another.',
      );
      return;
    }
    checkDocumentSchema(doc.content);
    dirty.current = true;
    setDocuments((current) => [...current, doc]);
    setActive(doc.id);
    setMode('write');
    setNotice('');
  }
  function updateDocument(doc: FolioDocument) {
    dirty.current = true;
    setDocuments((current) =>
      current.map((existing) => (existing.id === doc.id ? doc : existing)),
    );
  }
  async function openFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error('Choose a Folio or text file under 10 MB.');
      const text = await file.text();
      if (file.name.endsWith('.txt')) {
        const doc = newDocument();
        doc.title = file.name.replace(/\.txt$/i, '');
        doc.content = {
          type: 'doc',
          content: text.split(/\r?\n/).map((line) => ({
            type: 'paragraph',
            ...(line ? { content: [{ type: 'text', text: line }] } : {}),
          })),
        };
        addDocument(doc);
      } else if (file.name.endsWith('.folio.json'))
        addDocument(validateDocument(JSON.parse(text)));
      else
        throw new Error(
          'Open a .folio.json or .txt file. For a PDF, choose PDF tools.',
        );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Could not open this file.',
      );
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  function removeDraft() {
    const remaining = documents.filter((d) => d.id !== deleteId);
    if (!remaining.length) remaining.push(newDocument());
    setDocuments(remaining);
    if (active === deleteId) setActive(remaining[0].id);
    setDeleteId(null);
  }
  const current = documents.find((d) => d.id === active);
  return (
    <div className="editor-app">
      <header className="editor-header">
        <a
          href="https://github.com/furyengi/folio"
          className="editor-brand"
          aria-label="Folio source code"
        >
          folio<span>/</span>
        </a>
        <div className="document-identity">
          {current ? (
            <input
              aria-label="Document title"
              maxLength={200}
              value={current.title}
              onChange={(event) =>
                updateDocument({
                  ...current,
                  title: event.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              onBlur={() => {
                if (!current.title.trim())
                  updateDocument({ ...current, title: 'Untitled document' });
              }}
            />
          ) : (
            <strong>Untitled document</strong>
          )}
          <output aria-live="polite">{saveStatus}</output>
        </div>
        <div className="editor-header-actions">
          <a
            href="https://github.com/furyengi/folio"
            target="_blank"
            rel="noreferrer"
          >
            Open source <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} />
          </a>
          <Account />
        </div>
      </header>
      <div className="workspace-navigation">
        <Tabs value={mode} onValueChange={(value) => setMode(String(value))}>
          <TabsList className="mode-switch">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="pdf">PDF tools</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="document-tabs" aria-label="Open documents">
          {documents.map((doc) => (
            <div
              className={`document-tab ${doc.id === active ? 'selected' : ''}`}
              key={doc.id}
            >
              <button
                aria-pressed={doc.id === active}
                onClick={() => {
                  setActive(doc.id);
                  setMode('write');
                }}
              >
                <HugeiconsIcon icon={File01Icon} size={15} />
                <span>{doc.title || 'Untitled document'}</span>
              </button>
              <button
                aria-label={`Remove draft ${doc.title}`}
                title="Remove local draft"
                onClick={() => setDeleteId(doc.id)}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={13} />
              </button>
            </div>
          ))}
          <button
            className="new-document"
            aria-label="New document"
            disabled={!ready}
            onClick={() => addDocument()}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={17} />
          </button>
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".folio.json,.txt"
        onChange={(event) => void openFile(event.target.files?.[0])}
      />
      {notice && (
        <div className="workspace-notice">
          <output>{notice}</output>
          <button aria-label="Dismiss message" onClick={() => setNotice('')}>
            <HugeiconsIcon icon={Cancel01Icon} size={17} />
          </button>
        </div>
      )}
      {!ready && <main className="draft-loading">Opening your workspace…</main>}
      {documents.map((doc) => (
        <main
          key={doc.id}
          className="workspace-document"
          hidden={mode !== 'write' || active !== doc.id}
        >
          <DocumentEditor
            isActive={mode === 'write' && active === doc.id}
            document={doc}
            onChange={updateDocument}
            onNew={() => addDocument()}
            onOpen={() => fileInput.current?.click()}
            onPdfTools={() => setMode('pdf')}
          />
        </main>
      ))}
      <div className="pdf-pane" hidden={mode !== 'pdf'}>
        <div className="pdf-pane-intro">
          <span>PDF WORKSPACE</span>
          <p>
            Organize existing PDFs. Your editable drafts stay open in Write.
          </p>
        </div>
        <PdfWorkspace />
      </div>
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Remove this local draft?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes “{documents.find((d) => d.id === deleteId)?.title}”
            from this device. Download an editable copy first if you want to
            keep it.
          </AlertDialogDescription>
          <div className="modal-actions">
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction onClick={removeDraft}>
              Remove draft
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
