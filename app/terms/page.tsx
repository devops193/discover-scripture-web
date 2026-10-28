import type { Metadata } from 'next';
import { releaseContent } from '../releaseContent.generated';
import { DocumentPage } from '../site';

export const metadata: Metadata = { title: 'Terms & Conditions' };
export default function TermsPage() {
  return <DocumentPage document={{ ...releaseContent.terms, effectiveDate: 'October 28, 2026', lastUpdated: 'October 28, 2026' }} />;
}
