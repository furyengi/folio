export type NodeJSON = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: NodeJSON[];
};
export type FolioDocument = {
  version: 1;
  id: string;
  title: string;
  content: NodeJSON;
  paper: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margin: number;
  updatedAt: string;
};
export function newDocument(): FolioDocument {
  return {
    version: 1,
    id: crypto.randomUUID(),
    title: 'Untitled document',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    paper: 'A4',
    orientation: 'portrait',
    margin: 72,
    updatedAt: new Date().toISOString(),
  };
}
const nodes = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'hardBreak',
  'horizontalRule',
  'image',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
  'pageBreak',
]);
const marks = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'link',
  'textStyle',
]);
export function validateDocument(value: unknown): FolioDocument {
  if (!value || typeof value !== 'object')
    throw new Error('This is not a Folio document.');
  const doc = value as FolioDocument;
  if (
    doc.version !== 1 ||
    typeof doc.title !== 'string' ||
    doc.title.length > 200 ||
    !doc.content ||
    doc.content.type !== 'doc' ||
    !['A4', 'Letter'].includes(doc.paper) ||
    !['portrait', 'landscape'].includes(doc.orientation) ||
    ![36, 54, 72, 96].includes(doc.margin)
  )
    throw new Error('This file uses an unsupported document format.');
  let count = 0;
  function walk(node: NodeJSON, depth: number) {
    if (depth > 40 || ++count > 50000 || !node || !nodes.has(node.type))
      throw new Error('Unsupported document content.');
    if (node.text !== undefined && typeof node.text !== 'string')
      throw new Error('Invalid text.');
    if (
      node.attrs &&
      (!Number.isFinite(Number(node.attrs.level ?? 1)) ||
        JSON.stringify(node.attrs).length > 8000000)
    )
      throw new Error('Invalid formatting.');
    if (
      node.type === 'image' &&
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
        typeof node.attrs?.src === 'string' ? node.attrs.src : '',
      )
    )
      throw new Error('Only embedded PNG, JPEG, or WebP images are supported.');
    for (const mark of node.marks ?? []) {
      if (!marks.has(mark.type))
        throw new Error('Unsupported text formatting.');
      if (
        mark.type === 'link' &&
        !/^(https?:\/\/|mailto:)/i.test(
          typeof mark.attrs?.href === 'string' ? mark.attrs.href : '',
        )
      )
        throw new Error('This file contains an unsupported link.');
    }
    for (const child of node.content ?? []) walk(child, depth + 1);
  }
  walk(doc.content, 0);
  return {
    ...doc,
    id: crypto.randomUUID(),
    title: doc.title.trim() || 'Untitled document',
    updatedAt: new Date().toISOString(),
  };
}
export function documentText(node: NodeJSON): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? [])
    .map(documentText)
    .join(
      ['doc', 'blockquote', 'listItem', 'table', 'tableRow'].includes(node.type)
        ? '\n'
        : '',
    );
}
export function wordCount(node: NodeJSON) {
  return documentText(node).trim().split(/\s+/u).filter(Boolean).length;
}
export function saveFile(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
