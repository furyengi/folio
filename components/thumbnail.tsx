'use client';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
export default function Thumbnail({
  doc,
  index,
  rotation,
}: {
  doc: PDFDocumentProxy;
  index: number;
  rotation: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    if (box.current) observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']>
      | undefined;
    void (async () => {
      try {
        const page = await doc.getPage(index + 1);
        if (cancelled || !canvas.current) return;
        const viewport = page.getViewport({
          scale: 1,
          rotation: (page.rotate + rotation) % 360,
        });
        const scaled = page.getViewport({
          scale: Math.min(360 / viewport.width, 440 / viewport.height),
          rotation: (page.rotate + rotation) % 360,
        });
        canvas.current.width = scaled.width;
        canvas.current.height = scaled.height;
        render = page.render({ canvas: canvas.current, viewport: scaled });
        await render.promise;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [doc, index, rotation, visible]);
  return (
    <div ref={box} className="thumbnail">
      {failed ? (
        <span>
          Preview unavailable
          <br />
          Page {index + 1}
        </span>
      ) : (
        <canvas ref={canvas} aria-label={`Preview of page ${index + 1}`} />
      )}
    </div>
  );
}
