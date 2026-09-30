import type { Metadata } from 'next';
import Link from 'next/link';
import { PilotInquiry } from '../pilotForm';
import { MoreInfoButton } from '../moreInfo';
import { APP_STORE_URL, ProductShot, StatusBadge, productShots } from '../platform';
import { publicReleaseConfig } from '../releaseConfig.generated';
import { SiteShell } from '../site';

const description = 'Scripture Discovery CE is the Scripture-powered ministry operating system. Prepare teaching, organize service programs, run the live service with Commander CE, and send Scripture-aware content to the congregation with Smart Presenter.';

export const metadata: Metadata = {
  title: { absolute: 'Scripture Discovery CE | Ministry Operating System' },
  description,
  openGraph: {
    title: 'Scripture Discovery CE | Ministry Operating System',
    description,
    url: 'https://dscripture.com/church-edition',
    images: [{
      url: '/platform/commander-tablet.jpg',
      width: productShots.commander.width,
      height: productShots.commander.height,
      alt: productShots.commander.alt,
    }],
  },
};

const journey = [
  ['Study', 'Investigate Scripture'],
  ['Prepare', 'Build teaching and ministry material'],
  ['Program', 'Organize the service'],
  ['Command', 'Control the live experience'],
  ['Present', 'Send the right content to the congregation'],
  ['Connect', 'Extend ministry through the network'],
] as const;

const benefits = [
  ['For the pastor', 'Stay focused on the message.'],
  ['For the ministry team', 'Know what comes next and control the service from one place.'],
  ['For the congregation', 'Receive a clean, focused public presentation.'],
] as const;

const pilotAreas = [
  'Ministry preparation',
  'Service programs',
  'Scripture presentation',
  'Commander CE workflows',
  'Commander CE in real church environments',
] as const;

export default function ChurchEditionPage() {
  const supportEmail = publicReleaseConfig.supportEmail ?? 'support@jstifyd.com';

  return (
    <SiteShell>
      <main>
        <section className="ce-hero">
          <div>
            <p className="eyebrow">Scripture Discovery CE</p>
            <h1>Run ministry from Scripture outward.</h1>
            <p className="hero-lead">One Scripture-powered operating system for ministry preparation, service programs, live control, presentation, and connection.</p>
            <div className="cta-row">
              <a className="button" href="#pilot">Request a Pilot</a>
              <a className="button secondary" href={APP_STORE_URL} rel="noopener noreferrer" target="_blank">Download Scripture Discovery<span className="sr-only"> (opens in a new tab)</span></a>
            </div>
          </div>
          <div className="device-row" aria-label="Study, then control, then present">
            <ProductShot shot={productShots.phone} phone priority caption="Study" />
            <ProductShot shot={productShots.commander} priority caption="Control" />
            <ProductShot shot={productShots.presenter} priority caption="Present" />
          </div>
        </section>

        <section className="journey" aria-labelledby="journey-title">
          <p className="eyebrow">One platform. One ministry flow.</p>
          <h2 id="journey-title">From the text, into the room, and beyond the service.</h2>
          <p>From Scripture study to the live service and beyond, Discover Scripture keeps the ministry journey connected.</p>
          <ol className="journey-steps">
            {journey.map(([title, body]) => (
              <li key={title}><strong>{title}</strong><span>{body}</span></li>
            ))}
          </ol>
        </section>

        <section className="tool-block" aria-labelledby="research-title">
          <div className="tool-copy">
            <p className="eyebrow">Scripture Discovery</p>
            <h2 id="research-title">Research before you teach.</h2>
            <p>Investigate Scripture through Characters, Events, Concepts, questions, findings, evidence, related passages, comparisons, notes, and guided study before material reaches the pulpit.</p>
            <StatusBadge status="Available now" />
          </div>
          <ProductShot shot={productShots.phone} phone />
        </section>

        <section className="tool-block media-first" aria-labelledby="programs-title">
          <div className="tool-copy">
            <p className="eyebrow">Service Programs</p>
            <h2 id="programs-title">Build the flow of the service.</h2>
            <p>Organize Scripture, teaching points, worship, prayer, announcements, assignments, sections, and other program elements into one service flow.</p>
            <StatusBadge status="Pilot" />
          </div>
          <ProductShot shot={productShots.program} />
        </section>

        <section className="altar band-dark" id="commander-ce" aria-labelledby="commander-ce-title">
          <p className="eyebrow">Commander CE</p>
          <h2 id="commander-ce-title">Command the service.</h2>
          <p>Commander CE is the ministry control center of Church Edition—where the team runs the service, manages Scripture and program flow, and controls what reaches the congregation.</p>
          <p>Commander CE also represents Discover Scripture&rsquo;s physical altar deployment: a purpose-built ministry command center designed to bring Church Edition into the sanctuary.</p>
          <StatusBadge status="Pilot · Coming through selected deployments" />
          <div className="altar-split">
            <div>
              <p className="split-label">Private ministry side</p>
              <ProductShot shot={productShots.commander} />
              <ul>
                <li>Service program</li>
                <li>Teaching material</li>
                <li>Notes</li>
                <li>Ministry controls</li>
              </ul>
            </div>
            <p className="altar-arrow" aria-hidden="true">→</p>
            <div>
              <p className="split-label">Public side · Smart Presenter</p>
              <ProductShot shot={productShots.presenter} />
              <ul>
                <li>Scripture</li>
                <li>Teaching points</li>
                <li>Program content</li>
                <li>Congregation view</li>
              </ul>
            </div>
          </div>
          <div className="benefit-grid">
            {benefits.map(([title, body]) => (
              <article key={title}><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
          <a className="button" href="#pilot">Request a Church Edition Pilot</a>
        </section>

        <section className="tool-block" id="smart-presenter" aria-labelledby="smart-presenter-title">
          <div className="tool-copy">
            <h2 id="smart-presenter-title">Single Intelligent Platform to command your ministry</h2>
            <p>Private ministry control stays private. Scripture, teaching, and service content move cleanly from Commander CE to the congregation.</p>
          </div>
          <ProductShot shot={productShots.presenter} />
        </section>

        <section className="network" id="ministry-network" aria-labelledby="network-title">
          <p className="eyebrow">Discovery Ministry Network</p>
          <h2 id="network-title">Move ministry beyond the room.</h2>
          <MoreInfoButton ariaLabel="More info about Discovery Ministry Network" />
          <p>Connect churches, ministries, programs, broadcasts, partnerships, and community activity through one growing ministry network.</p>
          <p>The network is where ministry can move—from one church to many. Network broadcast and cross-church distribution are still developing and are not generally available.</p>
        </section>

        <section className="impact" id="foundation" aria-labelledby="supportlives-title">
          <p className="eyebrow">SupportLives</p>
          <h2 id="supportlives-title">Turn connection into practical help.</h2>
          <p>SupportLives brings churches, partners, donors, and communities together around real people and real needs.</p>
          <ul className="supportlives-list">
            <li>Ministry access</li>
            <li>Outreach</li>
            <li>Family support</li>
            <li>Community impact</li>
          </ul>
          <p className="foundation-note"><strong>DiscoveryMinistryNetworkCE Foundation</strong> <MoreInfoButton ariaLabel="More info about DiscoveryMinistryNetworkCE Foundation" /></p>
        </section>

        <section className="pilot band-dark" id="pilot" aria-labelledby="pilot-title">
          <div className="pilot-copy">
            <p className="eyebrow">Pilot</p>
            <h2 id="pilot-title">Become an early Church Edition pilot</h2>
            <p>We are inviting a small number of pastors, churches, and ministry leaders to help shape Scripture Discovery CE and Commander CE before wider release.</p>
            <ul>{pilotAreas.map((area) => <li key={area}>{area}</li>)}</ul>
            <p className="pilot-personal">
              <Link href="/#personal-edition">Looking for personal Scripture study? Explore Scripture Discovery →</Link>
            </p>
          </div>
          <div className="pilot-card">
            <PilotInquiry email={supportEmail} />
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
