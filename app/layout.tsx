import type { Metadata } from 'next';
import './globals.css';
import './reset.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.dscripture.com'),
  title: { default: 'Discover Scripture', template: '%s · Discover Scripture' },
  description: 'Questions worth asking. Evidence worth examining. Conclusions left to you.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
