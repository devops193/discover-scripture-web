import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '../site';

export const metadata: Metadata = {
  title: 'About',
  description: 'Discover Scripture is an evidence-grounded application for investigating Scripture.',
};

export default function AboutPage() {
  return <SiteShell><main className="document-page">
    <p className="eyebrow">Discover Scripture</p>
    <h1>About Discover Scripture</h1>
    <p className="document-intro">An evidence-grounded application for investigating Scripture. Questions worth asking. Evidence worth examining. Conclusions left to you.</p>
    <section className="document-section">
      <h2>Curiosity is enough.</h2>
      <p>Start with a Character, Event, or Concept. Follow the Questions. Examine the Findings.</p>
      <p><Link href="/product-app/">Explore Discover</Link></p>
    </section>
    <section className="document-section">
      <h2>Your investigation</h2>
      <p>Examine passages and the evidence behind each finding. Discover helps you explore; the conclusions are yours.</p>
      <p><Link href="/support">Contact Support</Link></p>
    </section>
  </main></SiteShell>;
}
