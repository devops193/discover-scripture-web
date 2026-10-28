import type { Metadata } from 'next';
import { ProductViewport } from './productViewport';
import { SiteShell } from './site';
import { publicReleaseConfig } from './releaseConfig.generated';

export const metadata: Metadata = {
  title: { absolute: 'Discover Scripture — Scripture. Investigated.' },
  description: 'Questions worth asking. Evidence worth examining. Conclusions left to you.',
  alternates: { canonical: 'https://www.dscripture.com/' },
  openGraph: {
    title: 'Discover Scripture — Scripture. Investigated.',
    description: 'Questions worth asking. Evidence worth examining. Conclusions left to you.',
    url: 'https://www.dscripture.com/',
    type: 'website',
  },
};

export default function Home() {
  return <SiteShell><main id="website-content" className="reset-home">
    <section className="reset-intro" aria-labelledby="home-title">
      <h1 id="home-title">Scripture. Investigated.</h1>
      <p>Questions worth asking. Evidence worth examining. Conclusions left to you.</p>
    </section>
    <ProductViewport />
    <section className="reset-section" aria-labelledby="curiosity-title">
      <h2 id="curiosity-title">Curiosity is enough.</h2>
      <p>Start with a Character, Event, or Concept. Follow the Questions. Examine the Findings.</p>
    </section>
    <section className="reset-section" aria-labelledby="future-title">
      <p className="eyebrow">Future direction</p>
      <h2 id="future-title">The investigation continues.</h2>
      <p>Historical arguments. Manuscript evidence. Timelines. Claims examined. Questions left open.</p>
      <p className="reset-note">Developing research capabilities—not available as a complete feature set today.</p>
    </section>
    <section className="reset-section" id="pricing" aria-labelledby="pricing-title">
      <p className="eyebrow">Scripture Discovery · iPhone and iPad</p>
      <h2 id="pricing-title">One purchase. No subscription.</h2>
      <p>{publicReleaseConfig.launchPriceDisplay} USD on the US App Store. Prices may vary by country or region.</p>
      <p><a href="https://apps.apple.com/us/app/scripture-discovery/id6810717915" target="_blank" rel="noopener noreferrer">View on the App Store<span className="sr-only"> (opens in a new tab)</span></a></p>
    </section>
  </main></SiteShell>;
}
