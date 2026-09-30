import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://dscripture.com'),
  title: { default: 'Discover Scripture', template: '%s · Discover Scripture' },
  description: 'A calm, offline-first instrument for investigating Scripture.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
