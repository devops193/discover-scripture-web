import type { Metadata } from 'next';
import { PilotInquiry } from '../pilotForm';
import { ProductVisual, SectionActions, StateBadge } from '../marketing';
import { publicReleaseConfig } from '../releaseConfig.generated';
import { SiteShell } from '../site';

export const metadata: Metadata = {
  title: { absolute: 'Church Pilot | Discover Scripture' },
  description: 'Join the Discover Scripture Church Pilot and test Scripture intelligence, Commander CE, and public presentation with your team.',
};

const pilotAnswers = [
  ['What is it?', 'A guided pilot that puts Scripture Discovered and Commander CE into a real church workflow.'],
  ['Who is it for?', 'Pastors, church leaders, ministry teams, and churches preparing or running services.'],
  ['What will you test?', 'Worlds, Scripture Tree, Scene Walk, Smart Presenter, the presentation queue, service runtime, public projection, and basic Church or organization identity.'],
  ['What do you need?', 'A church team, a compatible computer or tablet, and a display path for public projection.'],
  ['How long is onboarding?', 'Allow up to two hours for guided setup, followed by a rehearsal on your church\'s schedule.'],
  ['How do you join?', 'Send the short request below. We will confirm fit, timing, and the next available pilot window.'],
] as const;

const supporting = ['Semantic Lesson Search', 'Biblical Lessons', 'Notes', 'Anchors', 'Follow', 'Media and Stream Director', 'Teaching Points and Assignments'] as const;

export default function ChurchPilotPage() {
  const supportEmail = publicReleaseConfig.supportEmail ?? 'support@jstifyd.com';
  return (
    <SiteShell>
      <main className="gtm-page">
        <section className="gtm-page-hero gtm-split" aria-labelledby="pilot-page-title">
          <div className="gtm-section-copy">
            <p className="eyebrow">Church Pilot</p>
            <h1 id="pilot-page-title">Test the platform in your ministry.</h1>
            <p className="gtm-hero-lead">Prepare from Scripture, run a service, and control what reaches the congregation.</p>
            <StateBadge state="PILOT" />
            <SectionActions><a className="button" href="#join">Join the Church Pilot</a></SectionActions>
          </div>
          <ProductVisual src="/platform/church-edition-verse-focus.jpg" alt="Church Edition showing a Scripture verse focus and live service controls." width={1600} height={1200} priority />
        </section>

        <section className="gtm-page-section" aria-labelledby="pilot-answers-title">
          <p className="eyebrow">The pilot</p>
          <h2 id="pilot-answers-title">What your church should know.</h2>
          <div className="gtm-info-grid gtm-info-grid-three">
            {pilotAnswers.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>

        <section className="gtm-page-section gtm-supporting" aria-labelledby="supporting-title">
          <div>
            <p className="eyebrow">Supporting capabilities</p>
            <h2 id="supporting-title">Available where they support the pilot.</h2>
          </div>
          <ul>{supporting.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="gtm-page-section gtm-join" id="join" aria-labelledby="join-title">
          <div className="gtm-section-copy">
            <p className="eyebrow">Join</p>
            <h2 id="join-title">Start the Church Pilot conversation.</h2>
            <p>The request opens an email from your device. This website does not store the inquiry.</p>
          </div>
          <div className="pilot-card"><PilotInquiry email={supportEmail} /></div>
        </section>
      </main>
    </SiteShell>
  );
}
