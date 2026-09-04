'use client';
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { editorExtensions } from '@/lib/documents/schema';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Undo02Icon,
  Redo01Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  Image01Icon,
  Table01Icon,
  Link01Icon,
  Search01Icon,
  PrinterIcon,
  File01Icon,
  Download04Icon,
  PlusSignIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

import {
  type FolioDocument,
  type NodeJSON,
  documentText,
  wordCount,
  saveFile,
} from '@/lib/documents/model';

type Icon = typeof File01Icon;
function Command({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  icon?: Icon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`editor-command ${active ? 'is-active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon ? <HugeiconsIcon icon={icon} size={19} /> : children}
      <span>{label}</span>
    </button>
  );
}
function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(value) => {
        if (value !== null) onChange(String(value));
      }}
    >
      <SelectTrigger className="editor-choice" aria-label={label}>
        <SelectValue>
          {choices.find((c) => c.value === value)?.label ?? value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {choices.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
const fonts = ['Arial', 'Georgia', 'Times New Roman', 'Courier New'];
const sizes = ['10', '11', '12', '14', '16', '18', '24', '32', '48'];
export default function DocumentEditor({
  document: doc,
  isActive,
  onChange,
  onNew,
  onOpen,
  onPdfTools,
}: {
  document: FolioDocument;
  isActive: boolean;
  onChange: (next: FolioDocument) => void;
  onNew: () => void;
  onOpen: () => void;
  onPdfTools: () => void;
}) {
  const docRef = useRef(doc);

  const update = useRef(onChange);
  useEffect(() => {
    docRef.current = doc;
    update.current = onChange;
  }, [doc, onChange]);
  const [ribbon, setRibbon] = useState('Home'),
    [zoom, setZoom] = useState('100'),
    [message, setMessage] = useState(''),
    [modal, setModal] = useState<'find' | 'link' | null>(null),
    [search, setSearch] = useState(''),
    [replacement, setReplacement] = useState(''),
    [url, setUrl] = useState('https://'),
    [revision, setRevision] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: editorExtensions(),
    content: doc.content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'folio-document',
        spellcheck: 'true',
        'aria-label': 'Document editing area',
        'data-placeholder': 'Start writing…',
      },
    },
    onUpdate: ({ editor }) => {
      update.current({
        ...docRef.current,
        content: editor.getJSON() as NodeJSON,
        updatedAt: new Date().toISOString(),
      });
      setRevision((v) => v + 1);
    },
    onSelectionUpdate: () => setRevision((v) => v + 1),
  });
  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        setModal('find');
      }
    };
    editor.view.dom.addEventListener('keydown', handler);
    return () => editor.view.dom.removeEventListener('keydown', handler);
  }, [editor]);
  const headings: { text: string; position: number; level: number }[] = [];
  if (editor)
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'heading')
        headings.push({
          text: node.textContent || 'Untitled heading',
          position,
          level: Number(node.attrs.level),
        });
    });
  function changeLayout(values: Partial<FolioDocument>) {
    onChange({ ...doc, ...values, updatedAt: new Date().toISOString() });
  }
  function downloadNative() {
    saveFile(
      JSON.stringify(doc, null, 2),
      `${doc.title || 'Untitled'}.folio.json`,
      'application/json',
    );
    setMessage('Editable document downloaded.');
  }
  function print() {
    if (!editor) return;
    const previous = window.document.title;
    window.document.title = doc.title;
    window.print();
    window.document.title = previous;
  }
  async function insertImage(file: File | undefined) {
    if (!file || !editor) return;
    try {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 3 * 1024 * 1024
      )
        throw new Error('Choose a PNG, JPEG, or WebP image under 3 MB.');
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read image.'));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (JSON.stringify(docRef.current).length + data.length > 9 * 1024 * 1024)
        throw new Error(
          'This image would make the document too large. Use a smaller image.',
        );
      editor.chain().focus().setImage({ src: data, alt: file.name }).run();
      setMessage('Image inserted.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not insert this image.',
      );
    } finally {
      if (imageInput.current) imageInput.current.value = '';
    }
  }
  function matches() {
    const found: { from: number; to: number }[] = [];
    if (!editor || !search) return found;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isTextblock) return;
      const text = node
          .textBetween(0, node.content.size, '', '\uFFFC')
          .toLocaleLowerCase(),
        needle = search.toLocaleLowerCase();
      let offset = text.indexOf(needle);
      while (offset !== -1) {
        found.push({
          from: pos + 1 + offset,
          to: pos + 1 + offset + search.length,
        });
        offset = text.indexOf(needle, offset + Math.max(1, needle.length));
      }
      return false;
    });
    return found;
  }
  function findNext() {
    if (!editor) return;
    const found = matches();
    const next =
      found.find((m) => m.from >= editor.state.selection.to) ?? found[0];
    if (next) {
      editor.chain().setTextSelection(next).scrollIntoView().run();
      setMessage(
        `${found.length} match${found.length === 1 ? '' : 'es'} found.`,
      );
    } else setMessage('No matches found.');
  }
  function replaceAll() {
    if (!editor || !search) return;
    const found = matches();
    let transaction = editor.state.tr;
    for (const m of [...found].reverse())
      transaction = transaction.insertText(replacement, m.from, m.to);
    editor.view.dispatch(transaction);
    setMessage(
      `Replaced ${found.length} match${found.length === 1 ? '' : 'es'}.`,
    );
  }
  function applyLink() {
    if (!editor) return;
    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      setMessage('Use a web address beginning with https:// or mailto:.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setModal(null);
    setMessage('Link added.');
  }
  const style = editor?.isActive('heading', { level: 1 })
    ? '1'
    : editor?.isActive('heading', { level: 2 })
      ? '2'
      : editor?.isActive('heading', { level: 3 })
        ? '3'
        : '0';
  const dimensions = doc.paper === 'A4' ? [794, 1123] : [816, 1056];
  if (doc.orientation === 'landscape') dimensions.reverse();
  const paperStyle = {
    '--paper-width': `${dimensions[0]}px`,
    '--paper-height': `${dimensions[1]}px`,
    '--page-margin': `${doc.margin}px`,
    zoom: Number(zoom) / 100,
  } as React.CSSProperties;
  return (
    <div className="document-workbench" data-revision={revision}>
      {isActive && (
        <style>{`@media print { @page { size: ${doc.paper === 'A4' ? 'A4' : 'letter'} ${doc.orientation}; margin: ${doc.margin * 0.75}pt; } }`}</style>
      )}
      <Tabs
        value={ribbon}
        onValueChange={(v) => setRibbon(String(v))}
        className="ribbon"
      >
        <TabsList variant="line" className="ribbon-tabs">
          {['File', 'Home', 'Insert', 'Layout', 'Review', 'Export'].map(
            (tab) => (
              <TabsTrigger value={tab} key={tab}>
                {tab}
              </TabsTrigger>
            ),
          )}
        </TabsList>
        <TabsContent value="File" className="ribbon-panel">
          <div className="ribbon-group">
            <Command label="New" icon={PlusSignIcon} onClick={onNew} />
            <Command label="Open" icon={File01Icon} onClick={onOpen} />
            <Command
              label="Download editable"
              icon={Download04Icon}
              onClick={downloadNative}
            />
          </div>
          <div className="ribbon-group">
            <Command
              label="Print / Save PDF"
              icon={PrinterIcon}
              onClick={print}
            />
            <Command label="PDF tools" icon={File01Icon} onClick={onPdfTools} />
          </div>
          <p className="ribbon-help">
            Open .folio.json or .txt files.
            <br />
            Drafts save on this device.
          </p>
        </TabsContent>
        <TabsContent value="Home" className="ribbon-panel">
          <div className="ribbon-group">
            <Command
              label="Undo"
              icon={Undo02Icon}
              disabled={!editor?.can().undo()}
              onClick={() => {
                editor?.chain().focus().undo().run();
              }}
            />
            <Command
              label="Redo"
              icon={Redo01Icon}
              disabled={!editor?.can().redo()}
              onClick={() => {
                editor?.chain().focus().redo().run();
              }}
            />
          </div>
          <div className="ribbon-group formatting-group">
            <div className="choice-row">
              <Choice
                label="Paragraph style"
                value={style}
                choices={[
                  { label: 'Normal text', value: '0' },
                  { label: 'Heading 1', value: '1' },
                  { label: 'Heading 2', value: '2' },
                  { label: 'Heading 3', value: '3' },
                ]}
                onChange={(value) => {
                  if (value === '0')
                    editor?.chain().focus().setParagraph().run();
                  else
                    editor
                      ?.chain()
                      .focus()
                      .toggleHeading({ level: Number(value) as 1 | 2 | 3 })
                      .run();
                }}
              />
              <Choice
                label="Font family"
                value={String(
                  editor?.getAttributes('textStyle').fontFamily ?? 'Arial',
                )}
                choices={fonts.map((f) => ({ label: f, value: f }))}
                onChange={(value) => {
                  editor?.chain().focus().setFontFamily(value).run();
                }}
              />
              <Choice
                label="Font size"
                value={String(
                  editor?.getAttributes('textStyle').fontSize ?? '12pt',
                ).replace('pt', '')}
                choices={sizes.map((s) => ({ label: s, value: s }))}
                onChange={(value) => {
                  editor?.chain().focus().setFontSize(`${value}pt`).run();
                }}
              />
            </div>
            <div className="format-row">
              <Command
                label="Bold"
                icon={TextBoldIcon}
                active={editor?.isActive('bold')}
                onClick={() => {
                  editor?.chain().focus().toggleBold().run();
                }}
              />
              <Command
                label="Italic"
                icon={TextItalicIcon}
                active={editor?.isActive('italic')}
                onClick={() => {
                  editor?.chain().focus().toggleItalic().run();
                }}
              />
              <Command
                label="Underline"
                icon={TextUnderlineIcon}
                active={editor?.isActive('underline')}
                onClick={() => {
                  editor?.chain().focus().toggleUnderline().run();
                }}
              />
              <Command
                label="Strikethrough"
                active={editor?.isActive('strike')}
                onClick={() => {
                  editor?.chain().focus().toggleStrike().run();
                }}
              >
                <s>S</s>
              </Command>
              <Command
                label="Clear formatting"
                onClick={() => {
                  editor?.chain().focus().unsetAllMarks().clearNodes().run();
                }}
              >
                Tₓ
              </Command>
            </div>
          </div>
          <div className="ribbon-group formatting-group">
            <div className="format-row">
              {[
                { value: 'left', label: 'Align left', icon: TextAlignLeftIcon },
                { value: 'center', label: 'Center', icon: TextAlignCenterIcon },
                {
                  value: 'right',
                  label: 'Align right',
                  icon: TextAlignRightIcon,
                },
              ].map((item) => (
                <Command
                  key={item.value}
                  label={item.label}
                  icon={item.icon}
                  active={editor?.isActive({ textAlign: item.value })}
                  onClick={() => {
                    editor?.chain().focus().setTextAlign(item.value).run();
                  }}
                />
              ))}
              <Command
                label="Bullet list"
                active={editor?.isActive('bulletList')}
                onClick={() => {
                  editor?.chain().focus().toggleBulletList().run();
                }}
              >
                • ≡
              </Command>
              <Command
                label="Numbered list"
                active={editor?.isActive('orderedList')}
                onClick={() => {
                  editor?.chain().focus().toggleOrderedList().run();
                }}
              >
                1 ≡
              </Command>
            </div>
            <Choice
              label="Line spacing"
              value={String(
                editor?.getAttributes('textStyle').lineHeight ?? '1.6',
              )}
              choices={['1', '1.15', '1.5', '1.6', '2'].map((s) => ({
                label: `Spacing ${s}`,
                value: s,
              }))}
              onChange={(value) => {
                editor?.chain().focus().setLineHeight(value).run();
              }}
            />
          </div>
          <div className="ribbon-group">
            <Command
              label="Find & replace"
              icon={Search01Icon}
              onClick={() => setModal('find')}
            />
          </div>
        </TabsContent>
        <TabsContent value="Insert" className="ribbon-panel">
          <div className="ribbon-group">
            <Command
              label="Image"
              icon={Image01Icon}
              onClick={() => imageInput.current?.click()}
            />
            <Command
              label="Table"
              icon={Table01Icon}
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run();
              }}
            />
            <Command
              label="Link"
              icon={Link01Icon}
              onClick={() => {
                setUrl(
                  String(editor?.getAttributes('link').href ?? 'https://'),
                );
                setModal('link');
              }}
            />
            <Command
              label="Page break"
              icon={File01Icon}
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .insertContent({ type: 'pageBreak' })
                  .run();
              }}
            />
            <Command
              label="Divider"
              onClick={() => {
                editor?.chain().focus().setHorizontalRule().run();
              }}
            >
              ―
            </Command>
          </div>
          {editor?.isActive('table') ? (
            <div className="ribbon-group">
              <Command
                label="Add row"
                onClick={() => {
                  editor.chain().focus().addRowAfter().run();
                }}
              >
                + row
              </Command>
              <Command
                label="Add column"
                onClick={() => {
                  editor.chain().focus().addColumnAfter().run();
                }}
              >
                + col
              </Command>
              <Command
                label="Delete row"
                onClick={() => {
                  editor.chain().focus().deleteRow().run();
                }}
              >
                − row
              </Command>
              <Command
                label="Delete table"
                onClick={() => {
                  editor.chain().focus().deleteTable().run();
                }}
              >
                ×
              </Command>
            </div>
          ) : (
            <p className="ribbon-help">
              Insert at your cursor.
              <br />
              Select a table to show its controls.
            </p>
          )}
        </TabsContent>
        <TabsContent value="Layout" className="ribbon-panel">
          <div className="ribbon-group layout-choices">
            <div className="layout-label">
              Paper size
              <Choice
                label="Paper size"
                value={doc.paper}
                choices={['A4', 'Letter'].map((s) => ({ label: s, value: s }))}
                onChange={(value) =>
                  changeLayout({ paper: value as 'A4' | 'Letter' })
                }
              />
            </div>
            <div className="layout-label">
              Orientation
              <Choice
                label="Orientation"
                value={doc.orientation}
                choices={[
                  { label: 'Portrait', value: 'portrait' },
                  { label: 'Landscape', value: 'landscape' },
                ]}
                onChange={(value) =>
                  changeLayout({
                    orientation: value as 'portrait' | 'landscape',
                  })
                }
              />
            </div>
            <div className="layout-label">
              Margins
              <Choice
                label="Margins"
                value={String(doc.margin)}
                choices={[
                  { label: 'Narrow', value: '36' },
                  { label: 'Moderate', value: '54' },
                  { label: 'Normal', value: '72' },
                  { label: 'Wide', value: '96' },
                ]}
                onChange={(value) => changeLayout({ margin: Number(value) })}
              />
            </div>
          </div>
          <p className="ribbon-help">
            Continuous editing canvas.
            <br />
            Page breaks apply when printing.
          </p>
        </TabsContent>
        <TabsContent value="Review" className="ribbon-panel">
          <div className="ribbon-group">
            <Command
              label="Find & replace"
              icon={Search01Icon}
              onClick={() => setModal('find')}
            />
          </div>
          <p className="ribbon-help">
            <strong>{wordCount(doc.content)} words</strong> ·{' '}
            {documentText(doc.content).length} characters
            <br />
            Spelling suggestions use your browser’s dictionary.
          </p>
        </TabsContent>
        <TabsContent value="Export" className="ribbon-panel">
          <div className="ribbon-group">
            <Command
              label="Print / Save PDF"
              icon={PrinterIcon}
              onClick={print}
            />
            <Command
              label="Editable document"
              icon={Download04Icon}
              onClick={downloadNative}
            />
            <Command
              label="Plain text"
              icon={File01Icon}
              onClick={() =>
                saveFile(
                  documentText(doc.content),
                  `${doc.title}.txt`,
                  'text/plain',
                )
              }
            />
          </div>
          <p className="ribbon-help">
            Choose “Save as PDF” in the print dialog.
            <br />
            Use Folio format to keep editing later.
          </p>
        </TabsContent>
      </Tabs>
      <input
        hidden
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void insertImage(event.target.files?.[0])}
      />
      <div className="document-body">
        <aside className="document-outline">
          <div className="outline-title">
            DOCUMENT OUTLINE<span>{headings.length}</span>
          </div>
          {headings.length ? (
            headings.map((heading, i) => (
              <button
                key={`${i}-${heading.position}`}
                style={{ paddingLeft: 14 + (heading.level - 1) * 12 }}
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .setTextSelection(heading.position + 1)
                    .scrollIntoView()
                    .run()
                }
              >
                {heading.text}
              </button>
            ))
          ) : (
            <p>
              Your headings will
              <br />
              appear here.
            </p>
          )}
          <div className="outline-bottom">
            <HugeiconsIcon icon={File01Icon} size={18} />
            <span>
              {doc.paper} · {doc.orientation}
              <small>Saved on this device</small>
            </span>
          </div>
        </aside>
        <div className="document-stage">
          <div className="document-ruler" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
          <div className="paper" style={paperStyle}>
            <EditorContent editor={editor} />
            {!editor && <p className="editor-starting">Opening document…</p>}
          </div>
          <p className="canvas-note">
            FOLIO / {doc.paper} · {doc.orientation.toUpperCase()}
          </p>
        </div>
      </div>
      <div className="editor-status">
        <span>{wordCount(doc.content)} words</span>
        <span>Continuous page view</span>
        <output aria-live="polite">{message}</output>
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom(String(Math.max(50, Number(zoom) - 10)))}
          >
            −
          </button>
          <button
            onClick={() => setZoom('100')}
            aria-label="Reset zoom to 100 percent"
          >
            {zoom}%
          </button>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom(String(Math.min(150, Number(zoom) + 10)))}
          >
            +
          </button>
        </div>
      </div>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="editor-modal" showCloseButton={false}>
          <DialogClose className="close-button" aria-label="Close">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </DialogClose>
          <DialogTitle>
            {modal === 'find' ? 'Find & replace' : 'Insert link'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'find'
              ? 'Search text within a paragraph. Matches are case-insensitive.'
              : 'Select text in the document before adding a link.'}
          </DialogDescription>
          {modal === 'find' ? (
            <>
              <label>
                Find
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                Replace with
                <input
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="button quiet"
                  disabled={!search}
                  onClick={findNext}
                >
                  Find next
                </button>
                <button
                  className="button primary"
                  disabled={!search}
                  onClick={replaceAll}
                >
                  Replace all
                </button>
              </div>
            </>
          ) : (
            <>
              <label>
                Address
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="button quiet"
                  onClick={() => {
                    editor?.chain().focus().unsetLink().run();
                    setModal(null);
                  }}
                >
                  Remove link
                </button>
                <button className="button primary" onClick={applyLink}>
                  Apply link
                </button>
              </div>
            </>
          )}
          {message && <output>{message}</output>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
