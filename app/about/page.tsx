import type { Metadata } from 'next';
import { OwnershipPromise, SiteShell } from '../site';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <SiteShell><main className="document-page">
      <p className="eyebrow">Discover Scripture</p><h1>A calm instrument for reading closely</h1>
      <p className="document-intro">Discover creates conditions for observation. It does not complete the reader’s interpretation.</p>
      <section className="document-section"><h2>Local by design</h2><p>The complete canonical WEBU corpus and authored discoveries ship with the app. Ordinary reading, saved material, and investigation stay on the device.</p></section>
      <section className="document-section"><h2>Evidence remains inspectable</h2><p>Underlined citations open the supplied Scripture. Compare places sources together without turning the pairing into a conclusion.</p></section>
      <OwnershipPromise />
    </main></SiteShell>
  );
}
