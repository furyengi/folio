import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newDocument,
  validateDocument,
  wordCount,
  documentText,
} from '../lib/documents/model.ts';
import {
  checkDocumentSchema,
  editorExtensions,
} from '../lib/documents/schema.ts';
import { getSchema } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
test('editable document keeps formatting, tables and breaks on reopen', () => {
  const doc = newDocument();
  doc.content = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Project brief' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello world', marks: [{ type: 'bold' }] },
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Value' }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { type: 'pageBreak' },
      { type: 'paragraph' },
    ],
  };
  const reopened = validateDocument(JSON.parse(JSON.stringify(doc)));
  checkDocumentSchema(reopened.content);
  assert.deepEqual(reopened.content, doc.content);
  assert.notEqual(reopened.id, doc.id);
  assert.equal(wordCount(reopened.content), 5);
});
test('rejects external images, unsafe links and unsupported versions', () => {
  const doc = newDocument();
  assert.throws(() => validateDocument({ ...doc, version: 2 }));
  assert.throws(
    () =>
      validateDocument({
        ...doc,
        content: {
          type: 'doc',
          content: [
            { type: 'image', attrs: { src: 'https://tracker.example/pixel' } },
          ],
        },
      }),
    /embedded/,
  );
  assert.throws(
    () =>
      validateDocument({
        ...doc,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'link',
                  marks: [
                    { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                  ],
                },
              ],
            },
          ],
        },
      }),
    /link/,
  );
});
test('schema rejects invalid node nesting instead of dropping text', () => {
  assert.throws(() =>
    checkDocumentSchema({
      type: 'doc',
      content: [{ type: 'text', text: 'lost text' }],
    }),
  );
});
test('editor transactions can change text while preserving other blocks', () => {
  const schema = getSchema(editorExtensions());
  let state = EditorState.create({
    schema,
    doc: schema.nodeFromJSON({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ],
    }),
  });
  state = state.apply(state.tr.insertText('Edited', 1, 6));
  assert.equal(documentText(state.doc.toJSON()), 'Edited\nSecond');
});
