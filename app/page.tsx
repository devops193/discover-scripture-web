import type { Metadata } from 'next';
import Link from 'next/link';
import { publicationsFor } from './featurePublications';
import { LIVE_APP_URL, ProductVisual, ScriptureFeatureGallery, SectionActions, StateBadge } from './marketing';
import { ProductViewport } from './productViewport';
import { SiteShell } from './site';

export const metadata: Metadata = {
  title: { absolute: 'Discover Scripture — Scripture, discovered' },
  description: 'Explore Scripture Discovered, Commander CE, Church Pilot, and Network and Partners.',
};

const commander = publicationsFor('Commander CE')[0];
const network = publicationsFor('Network and Partners')[0];

export default function Home() {
  return (
    <SiteShell>
      <main>
        <section className="gtm-hero" aria-labelledby="home-title">
          <div className="gtm-hero-copy">
            <h1 id="home-title">Scripture,<br />discovered.</h1>
            <p className="gtm-hero-lead">Explore Scripture through different lenses: people, event, concepts, timelines, history, original language translation, and walk the scenes through different paths.</p>
            <p className="gtm-audience">For readers, teachers, and churches.</p>
            <SectionActions>
              <Link className="button" href={LIVE_APP_URL}>Open Scripture Discovered</Link>
            </SectionActions>
          </div>
          <ProductVisual src="/platform/scripture-discovery-iphone.jpg" alt="Scripture Discovered showing Character, Event, and Concept entry points on iPhone." width={900} height={2004} priority className="gtm-hero-phone" />
        </section>

        <section className="gtm-section gtm-scripture" id="scripture-discovered" aria-labelledby="scripture-title">
          <div className="gtm-section-intro">
            <div>
              <p className="eyebrow">Scripture Discovered</p>
              <h2 id="scripture-title">Explore a World.<br />Follow the story.</h2>
            </div>
            <div>
              <p>Ask the questions. See what Scripture supports.</p>
              <Link className="button" href={LIVE_APP_URL}>Open Scripture Discovered</Link>
            </div>
          </div>
          <ScriptureFeatureGallery />
          <div className="gtm-live-app" aria-label="Live Scripture Discovered application">
            <p className="gtm-live-label"><span aria-hidden="true" /> Live web application</p>
            <ProductViewport />
          </div>
        </section>

        <section className="gtm-section gtm-split gtm-dark" id="commander-ce" aria-labelledby="commander-title">
          <div className="gtm-section-copy">
            <p className="eyebrow">Commander CE</p>
            <h2 id="commander-title">Research it.<br />Teach it.<br />Present it.<br />Run the service.</h2>
            <p>One ministry workspace for Scripture intelligence and live Church presentation.</p>
            <StateBadge state="PILOT" />
            <SectionActions>
              <Link className="button light" href="/church-edition">Explore Commander CE</Link>
              <Link className="gtm-text-link light" href="/church-pilot">Join the Church Pilot</Link>
            </SectionActions>
          </div>
          <ProductVisual src={commander.imageOrDemo} alt={commander.imageAlt} width={commander.imageWidth} height={commander.imageHeight} />
        </section>

        <section className="gtm-section gtm-split" id="network-and-partners" aria-labelledby="network-title">
          <div className="gtm-section-copy">
            <p className="eyebrow">Network and Partners</p>
            <h2 id="network-title">Connected around real ministry work.</h2>
            <p>Programs, providers, referrals, verified activity, and shared ministry operations.</p>
            <StateBadge state="PREVIEW" />
            <p className="gtm-small-copy">For churches, ministries, service providers, humanitarian programs, and partners.</p>
          </div>
          <ProductVisual src={network.imageOrDemo} alt={network.imageAlt} width={network.imageWidth} height={network.imageHeight} />
        </section>

        <section className="gtm-section gtm-split gtm-accent" id="church-pilot" aria-labelledby="pilot-home-title">
          <div className="gtm-section-copy">
            <h2 id="pilot-home-title">Put the platform into a real service.</h2>
            <p>Test Worlds, Smart Presenter, Scene Walk, Scripture Tree, the presentation queue, and public projection with your team.</p>
          </div>
          <ProductVisual src="/platform/church-edition-verse-focus.jpg" alt="Church Edition showing a Scripture verse focus and live service controls." width={1600} height={1200} />
        </section>

      </main>
    </SiteShell>
  );
}
