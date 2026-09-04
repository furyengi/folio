import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { PageBreak } from './extensions.ts';
import type { NodeJSON } from './model.ts';
export function editorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, protocols: ['http', 'https', 'mailto'] },
    }),
    TextStyleKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.extend({
      parseHTML() {
        return [
          {
            tag: 'img[src]',
            getAttrs: (element) =>
              /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
                element.getAttribute('src') ?? '',
              )
                ? null
                : false,
          },
        ];
      },
    }).configure({ allowBase64: true }),
    TableKit.configure({ table: { resizable: true } }),
    PageBreak,
  ];
}
export function checkDocumentSchema(content: NodeJSON) {
  const schema = getSchema(editorExtensions());
  schema.nodeFromJSON(content).check();
}
