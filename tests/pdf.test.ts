import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, degrees } from 'pdf-lib';
import { exportPdf } from '../lib/pdf.ts';
async function fixture(widths: number[]) {
  const doc = await PDFDocument.create();
  widths.forEach((width) => doc.addPage([width, 400]));
  return doc.save();
}
test('merge preserves chosen document and page order', async () => {
  const a = await fixture([100, 200]),
    b = await fixture([300]);
  const bytes = await exportPdf(
    [
      { id: 'a', name: 'a', bytes: a },
      { id: 'b', name: 'b', bytes: b },
    ],
    [
      { id: '1', sourceId: 'b', index: 0, rotation: 0, selected: true },
      { id: '2', sourceId: 'a', index: 1, rotation: 0, selected: true },
      { id: '3', sourceId: 'a', index: 0, rotation: 0, selected: true },
    ],
  );
  const result = await PDFDocument.load(bytes);
  assert.deepEqual(
    result.getPages().map((p) => p.getWidth()),
    [300, 200, 100],
  );
});
test('split excludes unchecked pages and rotates selected pages', async () => {
  const bytes = await exportPdf(
    [{ id: 'a', name: 'a', bytes: await fixture([100, 200]) }],
    [
      { id: '1', sourceId: 'a', index: 0, rotation: 0, selected: false },
      { id: '2', sourceId: 'a', index: 1, rotation: 90, selected: true },
    ],
  );
  const result = await PDFDocument.load(bytes);
  assert.equal(result.getPageCount(), 1);
  assert.equal(result.getPage(0).getWidth(), 200);
  assert.equal(result.getPage(0).getRotation().angle, 90);
});
test('adds rotation to an already rotated source', async () => {
  const source = await PDFDocument.create();
  source.addPage().setRotation(degrees(270));
  const bytes = await exportPdf(
    [{ id: 'a', name: 'a', bytes: await source.save() }],
    [{ id: '1', sourceId: 'a', index: 0, rotation: 90, selected: true }],
  );
  assert.equal(
    (await PDFDocument.load(bytes)).getPage(0).getRotation().angle,
    0,
  );
});
test('rejects empty selections, missing sources, and corrupt input', async () => {
  await assert.rejects(() => exportPdf([], []), /Select/);
  await assert.rejects(
    () =>
      exportPdf(
        [],
        [
          {
            id: '1',
            sourceId: 'missing',
            index: 0,
            rotation: 0,
            selected: true,
          },
        ],
      ),
    /missing/,
  );
  await assert.rejects(() =>
    exportPdf(
      [{ id: 'a', name: 'a', bytes: new Uint8Array([1, 2]) }],
      [{ id: '1', sourceId: 'a', index: 0, rotation: 0, selected: true }],
    ),
  );
});
