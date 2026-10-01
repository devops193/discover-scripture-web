import Link from 'next/link';
import type { ReactNode } from 'react';
import { MoreInfoButton } from './moreInfo';

export const APP_STORE_URL = 'https://apps.apple.com/us/app/scripture-discovery/id6810717915';

export const productShots = {
  phone: {
    src: '/platform/scripture-discovery-iphone.jpg',
    width: 900,
    height: 2004,
    alt: 'Scripture Discovery on iPhone, showing Character, Event, and Concept investigations.',
  },
  commander: {
    src: '/platform/commander-tablet.jpg',
    width: 1600,
    height: 1110,
    alt: 'Commander CE on a tablet during a Sunday Worship Service, with a Scripture scene, public preview, and the service order.',
  },
  churchEdition: {
    src: '/platform/church-edition-verse-focus.jpg',
    width: 1600,
    height: 1200,
    alt: 'Scripture Discovery CE on a tablet during Sunday Worship Service, showing a Verse Focus of John 4:1–26 with service navigation, Broadcast controls, and the Commander tab.',
  },
  program: {
    src: '/platform/service-program.jpg',
    width: 1600,
    height: 1200,
    alt: 'Church Edition service program editor showing Opening, Opening Prayer, and Worship blocks for Sunday Worship Service.',
  },
  presenter: {
    src: '/platform/commander-ministry-platform.jpg',
    width: 1600,
    height: 1200,
    alt: 'Commander open beside a Verse Focus of John 4:1–26 during Covenant Fellowship Sunday Worship Service, with Broadcast and Public controls.',
  },
} as const;

export function StatusBadge({ status }: { status: string }) {
  return <p className="status-badge">{status}</p>;
}

export function ProductShot({
  shot,
  phone = false,
  priority = false,
  caption,
}: {
  shot: (typeof productShots)[keyof typeof productShots];
  phone?: boolean;
  priority?: boolean;
  caption?: string;
}) {
  return (
    <figure className="device-slot">
      <div className={phone ? 'device-frame device-phone' : 'device-frame'}>
        {/* Real product captures, sized in CSS like the existing store artwork. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shot.src}
          alt={shot.alt}
          width={shot.width}
          height={shot.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function StoreCta({ children, className }: { children: string; className?: string }) {
  return (
    <a className={className} href={APP_STORE_URL} rel="noopener noreferrer" target="_blank">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function MinistryHero() {
  return (
    <section className="hero ministry-hero">
      <div className="hero-copy">
        <p className="eyebrow">Scripture Discovery CE</p>
        <h1>Run ministry from Scripture outward.</h1>
        <p className="hero-lead">One Scripture-powered operating system for ministry preparation, service programs, live control, presentation, and connection.</p>
        <div className="cta-row">
          <Link className="button" href="/church-edition">Explore Church Edition</Link>
          <Link className="button secondary" href="/church-edition#pilot">Request a Pilot</Link>
        </div>
        <p className="hero-secondary-link">
          Looking for personal Scripture study? <a href="#personal-edition">Explore Scripture Discovery →</a>
        </p>
      </div>
      <ProductShot shot={productShots.commander} priority />
    </section>
  );
}

const ministryFlow = ['Study', 'Prepare', 'Program', 'Command', 'Present', 'Connect'] as const;

export function MinistryFlowSection() {
  return (
    <section className="ministry-flow" aria-labelledby="ministry-flow-title">
      <p className="eyebrow">One platform. One ministry flow.</p>
      <h2 id="ministry-flow-title">From Scripture to the room and beyond.</h2>
      <ol className="flow-chain" aria-label="Study, Prepare, Program, Command, Present, Connect">
        {ministryFlow.map((step, index) => (
          <li key={step}>
            <span className="flow-index" aria-hidden="true">0{index + 1}</span>
            <span className="flow-word">{step}</span>
          </li>
        ))}
      </ol>
      <p className="ministry-flow-copy">From Scripture study to the live service and beyond, Discover Scripture keeps the ministry journey connected.</p>
    </section>
  );
}

export function ChurchEditionSection() {
  return (
    <section className="tool-block media-first" id="church-edition-summary" aria-labelledby="ce-home-title">
      <div className="tool-copy">
        <p className="eyebrow">Scripture Discovery CE</p>
        <h2 id="ce-home-title">The ministry operating system.</h2>
        <p>Scripture intelligence, teaching preparation, service programs, presentation, and ministry workflow—connected in one environment.</p>
        <p className="tool-benefit">Prepare with depth. Run the service with clarity. Keep Scripture at the center.</p>
        <StatusBadge status="Pilot" />
        <div className="cta-row">
          <Link className="button" href="/church-edition">Explore Church Edition</Link>
          <Link className="button secondary" href="/church-edition#pilot">Request a Pilot</Link>
        </div>
      </div>
      <ProductShot shot={productShots.churchEdition} />
    </section>
  );
}

export function CommanderCESection() {
  return (
    <section className="altar band-dark" id="commander-ce" aria-labelledby="commander-ce-title">
      <p className="eyebrow">Commander CE</p>
      <h2 id="commander-ce-title">Command the service.</h2>
      <p>Commander CE is the ministry control center of Church Edition—where the team runs the service, manages Scripture and program flow, and controls what reaches the congregation.</p>
      <p>Commander CE also represents Discover Scripture&rsquo;s physical altar deployment: a purpose-built ministry command center designed to bring Church Edition into the sanctuary.</p>
      <StatusBadge status="Pilot · Coming through selected deployments" />
      <div className="commander-ce-visual">
        <ProductShot shot={productShots.commander} />
      </div>
    </section>
  );
}

export function SmartPresenterSection() {
  return (
    <section className="tool-block" id="smart-presenter" aria-labelledby="smart-presenter-title">
      <div className="tool-copy">
        <h2 id="smart-presenter-title">Single Intelligent Platform to command your ministry</h2>
        <p>Private ministry control stays private. Scripture, teaching, and service content move cleanly from Commander CE to the congregation.</p>
      </div>
      <ProductShot shot={productShots.presenter} />
    </section>
  );
}

export function MinistryNetworkSection() {
  return (
    <section className="network" id="ministry-network" aria-labelledby="ministry-network-title">
      <p className="eyebrow">Discovery Ministry Network</p>
      <h2 id="ministry-network-title">Move ministry beyond the room.</h2>
      <MoreInfoButton ariaLabel="More info about Discovery Ministry Network" />
      <p>Connect churches, ministries, programs, broadcasts, partnerships, and community activity through one growing ministry network.</p>
      <p>The network is where ministry can move—from one church to many. Network broadcast and cross-church distribution are still developing and are not generally available.</p>
    </section>
  );
}

const supportLivesAreas = ['Ministry access', 'Outreach', 'Family support', 'Community impact'] as const;

export function SupportLivesSection() {
  return (
    <section className="impact" id="foundation" aria-labelledby="supportlives-title">
      <p className="eyebrow">SupportLives</p>
      <h2 id="supportlives-title">Turn connection into practical help.</h2>
      <p>SupportLives brings churches, partners, donors, and communities together around real people and real needs.</p>
      <ul className="supportlives-list">
        {supportLivesAreas.map((area) => <li key={area}>{area}</li>)}
      </ul>
      <div className="foundation-note"><strong>DiscoveryMinistryNetworkCE Foundation</strong> <MoreInfoButton ariaLabel="More info about DiscoveryMinistryNetworkCE Foundation" /></div>
    </section>
  );
}

export function PersonalEditionSection({ children }: { children: ReactNode }) {
  return (
    <section className="personal-edition" id="personal-edition" aria-labelledby="personal-edition-title">
      <div className="personal-lead">
        <p className="eyebrow">Scripture Discovery</p>
        <h2 id="personal-edition-title">Scripture intelligence for everyone.</h2>
        <p>The same Scripture foundation that powers Scripture Discovery CE is available to individuals through Scripture Discovery.</p>
        <p className="tool-benefit">Read. Investigate. Ask. Compare. Discover.</p>
        <div className="cta-row">
          <StoreCta className="button">Download on the App Store</StoreCta>
        </div>
      </div>
      <div className="personal-body">{children}</div>
    </section>
  );
}
