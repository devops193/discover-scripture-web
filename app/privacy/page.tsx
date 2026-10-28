import type { Metadata } from 'next';
import { releaseContent } from '../releaseContent.generated';
import { DocumentPage } from '../site';

export const metadata: Metadata = { title: 'Privacy Policy' };
export default function PrivacyPage() {
  return <DocumentPage document={{ ...releaseContent.privacy, effectiveDate: 'October 28, 2026', lastUpdated: 'October 28, 2026' }} />;
}
