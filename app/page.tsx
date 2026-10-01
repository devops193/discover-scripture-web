import type { Metadata } from 'next';
import {
  ChurchEditionSection,
  CommanderCESection,
  MinistryFlowSection,
  MinistryHero,
  MinistryNetworkSection,
  PersonalEditionSection,
  SmartPresenterSection,
  SupportLivesSection,
} from './platform';
import { releaseContent } from './releaseContent.generated';
import { OwnershipPromise, SiteShell } from './site';
import { ProductViewport } from './productViewport';

const principles = [
  ['Follow', 'People across changing places, relationships, decisions, pressure, failure, and memory.'],
  ['Enter', 'Events as scenes—not summaries—with people, actions, tensions, consequences, and source evidence.'],
  ['Trace', 'Ideas and patterns across books, voices, and moments in Scripture.'],
] as const;

export const metadata: Metadata = {
  title: { absolute: 'Discover Scripture — Scripture-powered ministry operating system' },
  description: 'Scripture Discovery CE is a Scripture-powered ministry operating system for teaching preparation, service programs, live control with Commander CE, Smart Presenter, and connection across ministry. Scripture Discovery is the personal edition of the same Scripture intelligence platform.',
};

export default function Home() {
  return (
    <SiteShell>
      <main>
        <ProductViewport />
        <div id="website-content" />
        <MinistryHero />
        <MinistryFlowSection />
        <ChurchEditionSection />
        <CommanderCESection />
        <SmartPresenterSection />
        <MinistryNetworkSection />
        <SupportLivesSection />
        <PersonalEditionSection>
          <section className="principles" aria-labelledby="three-lenses">
            <p className="eyebrow">Three lenses</p>
            <h2 id="three-lenses">A whole-canon Scripture instrument—including the Apocrypha—built for attention</h2>
            <div className="principle-grid">
              {principles.map(([title, body], index) => (
                <article key={title}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="library" aria-labelledby="library-title">
            <p className="eyebrow">{releaseContent.home.libraryEyebrow}</p>
            <h2 id="library-title">{releaseContent.home.libraryTitle}</h2>
            <p className="library-stats">{releaseContent.home.libraryStats.map((stat) => <span key={stat}>{stat}</span>)}</p>
            <p>{releaseContent.home.libraryNote}</p>
          </section>
          <section className="positioning">
            <div>
              <p className="eyebrow">A different posture</p>
              <h2>{releaseContent.home.positioningTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
            </div>
            <p>{releaseContent.home.positioningBody}</p>
          </section>
          <section className="included" aria-labelledby="included-title">
            <div>
              <p className="eyebrow">Included</p>
              <h2 id="included-title">One instrument.<br />Local Scripture.<br />No reader account.</h2>
            </div>
            <ul>{releaseContent.home.included.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <OwnershipPromise />
        </PersonalEditionSection>
      </main>
    </SiteShell>
  );
}
