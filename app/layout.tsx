import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medical Research Drug Library',
  description: 'Clinical research documents across 7 categories and 19 approved drug publications.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
