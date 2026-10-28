import type { Metadata } from 'next';
import { releaseContent } from '../releaseContent.generated';
import { DocumentPage } from '../site';

export const metadata: Metadata = { title: 'Support' };

export default function SupportPage() {
  return <DocumentPage document={{ ...releaseContent.support, effectiveDate: 'October 28, 2026', lastUpdated: 'October 28, 2026' }} />;
}
