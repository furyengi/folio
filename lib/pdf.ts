import { PDFDocument, degrees } from 'pdf-lib';
export type Source = { id: string; name: string; bytes: Uint8Array };
export type PageRecipe = {
  id: string;
  sourceId: string;
  index: number;
  rotation: number;
  selected: boolean;
};
export async function exportPdf(sources: Source[], pages: PageRecipe[]) {
  const chosen = pages.filter((p) => p.selected);
  if (!chosen.length) throw new Error('Select at least one page.');
  const out = await PDFDocument.create();
  const docs = new Map<string, PDFDocument>();
  for (const item of chosen) {
    let doc = docs.get(item.sourceId);
    if (!doc) {
      const source = sources.find((s) => s.id === item.sourceId);
      if (!source) throw new Error('Source document is missing.');
      doc = await PDFDocument.load(source.bytes);
      docs.set(item.sourceId, doc);
    }
    if (item.index < 0 || item.index >= doc.getPageCount())
      throw new Error('Page is outside the document.');
    const [page] = await out.copyPages(doc, [item.index]);
    page.setRotation(degrees((page.getRotation().angle + item.rotation) % 360));
    out.addPage(page);
  }
  return out.save();
}
