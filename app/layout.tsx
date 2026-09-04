import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Folio — Write, edit, and work with PDFs',
  description:
    'A free, open-source document editor with local autosave and PDF tools. Write, format, and export on your device.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
