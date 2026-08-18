import type { Metadata } from 'next';
import './globals.css';
import './proto.css';
import './tailwind-stitch.css';

export const metadata: Metadata = {
  title: 'Think IT Cyber Academy',
  description: 'Aprenda. Pratique. Evolua.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
