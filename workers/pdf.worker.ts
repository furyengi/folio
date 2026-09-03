import { exportPdf } from '../lib/pdf';
self.onmessage = async (event) => {
  try {
    const bytes = await exportPdf(event.data.sources, event.data.pages);
    self.postMessage({ bytes }, { transfer: [bytes.buffer] });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : 'Could not export this document.',
    });
  }
};
