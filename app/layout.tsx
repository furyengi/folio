import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Folio — The PDF workspace',
  description:
    'Merge, split, rotate, and arrange PDFs privately in your browser. Free and open source.',
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
