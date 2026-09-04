import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDocument } from '../lib/documents/model.ts';
import { saveWorkspace, loadWorkspace } from '../lib/documents/storage.ts';
test('autosave round trip retains latest revision and all open drafts', async () => {
  const first = newDocument(),
    second = newDocument();
  first.title = 'Notes';
  second.title = 'Another document';
  await saveWorkspace({ documents: [first, second], activeId: first.id });
  const updated = {
    ...first,
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Latest edit' }] },
      ],
    },
  };
  await Promise.all([
    saveWorkspace({ documents: [first, second], activeId: first.id }),
    saveWorkspace({ documents: [updated, second], activeId: second.id }),
  ]);
  const restored = await loadWorkspace();
  assert.equal(restored?.activeId, second.id);
  assert.deepEqual(restored?.documents[0].content, updated.content);
  assert.equal(restored?.documents.length, 2);
});
