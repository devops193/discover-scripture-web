import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductVisual, SectionActions, StateBadge } from '../marketing';
import { SiteShell } from '../site';

export const metadata: Metadata = {
  title: { absolute: 'Commander CE | Discover Scripture' },
  description: 'Research, teach, present, and run the service with Commander CE.',
};

const capabilities = [
  ['Research', 'Open Scripture intelligence and prepare the material behind the service.'],
  ['Present', 'Build a queue and send the right Scripture or teaching point to the room.'],
  ['Run', 'Move through the service while private controls stay with the ministry team.'],
] as const;

export default function CommanderPage() {
  return (
    <SiteShell>
      <main className="gtm-page">
        <section className="gtm-page-hero gtm-split" aria-labelledby="commander-page-title">
          <div className="gtm-section-copy">
            <p className="eyebrow">Commander CE</p>
            <h1 id="commander-page-title">Research it. Teach it. Present it. Run the service.</h1>
            <p className="gtm-hero-lead">One ministry workspace for Scripture intelligence and live Church presentation.</p>
            <StateBadge state="PILOT" />
            <SectionActions>
              <Link className="button" href="/church-pilot">Join the Church Pilot</Link>
              <Link className="button secondary" href="/product-app/?product=commander">Open Commander CE</Link>
            </SectionActions>
          </div>
          <ProductVisual src="/platform/commander-tablet.jpg" alt="Commander CE controlling a Sunday Worship Service and its public Scripture presentation." width={1600} height={1110} priority />
        </section>

        <section className="gtm-page-section" aria-labelledby="commander-capabilities-title">
          <p className="eyebrow">One workspace</p>
          <h2 id="commander-capabilities-title">From Scripture to the room.</h2>
          <div className="gtm-info-grid">
            {capabilities.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>

        <section className="gtm-page-section gtm-split gtm-accent" aria-labelledby="presenter-title">
          <div className="gtm-section-copy">
            <p className="eyebrow">Smart Presenter</p>
            <h2 id="presenter-title">Public content. Private controls.</h2>
            <p>Scripture, teaching points, and service content move to the congregation without exposing the ministry workspace.</p>
            <StateBadge state="PILOT" />
          </div>
          <ProductVisual src="/platform/public-presenter.jpg" alt="Public Presenter showing Scripture for a Sunday Worship Service." width={1600} height={1200} />
        </section>
      </main>
    </SiteShell>
  );
}
