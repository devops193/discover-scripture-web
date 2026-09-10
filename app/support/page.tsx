import type { Metadata } from 'next';
import Link from 'next/link';
import { publicReleaseConfig } from '../releaseConfig.generated';
import { SiteShell } from '../site';

export const metadata: Metadata = { title: 'Support' };

const supportEmail = publicReleaseConfig.supportEmail ?? 'Support email pending release configuration';

export default function SupportPage() {
  return (
    <SiteShell><main className="document-page">
      <p className="eyebrow">Discover Scripture</p>
      <h1>Support</h1>
      <p className="document-intro">Need help with Discover Scripture?</p>
      <div className="support-copy">
        <p>If something isn’t working as expected, or you have a question about Discover Scripture, contact support.</p>
        <p>When reporting an issue, it helps to include your device model, iOS version, app version, and a short description of what happened.</p>
      </div>
      <section className="document-section">
        <h2>Contact Support</h2>
        {publicReleaseConfig.supportEmail ? (
          <a className="button" href={`mailto:${supportEmail}`}>Email {supportEmail}</a>
        ) : (
          <p>{supportEmail}</p>
        )}
      </section>
      <section className="document-section">
        <h2>Purchases and downloads</h2>
        <p>Discover Scripture is a one-time App Store purchase. Purchase history, downloads, and re-downloads are managed through your Google and Apple account, the App Store and Google Play Store.</p>
      </section>
      <section className="document-section">
        <h2>Privacy and Terms</h2>
        <p><Link href="/privacy">Privacy Policy</Link></p>
        <p><Link href="/terms">Terms & Conditions</Link></p>
      </section>
    </main></SiteShell>
  );
}
