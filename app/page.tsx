import { releaseContent } from './releaseContent.generated';
import { OwnershipPromise, SiteShell } from './site';
import { StoreLinks } from './storeLinks';

const principles = [
  ['Follow', 'People across changing places, relationships, decisions, pressure, failure, and memory.'],
  ['Enter', 'Events as scenes—not summaries—with people, actions, tensions, consequences, and source evidence.'],
  ['Trace', 'Ideas and patterns across books, voices, and moments in Scripture.'],
] as const;

export default function Home() {
  return (
    <SiteShell><main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">{releaseContent.home.eyebrow}</p><h1>{releaseContent.home.title}</h1><p className="hero-lead">{releaseContent.home.lead}</p><StoreLinks /></div>
        <div className="instrument-card" aria-label="A sample Scripture investigation">
          <p className="eyebrow">Look again</p><blockquote>“What becomes visible when passages are held together?”</blockquote>
          <div className="source-line"><span>Source</span><strong>Inspectable Scripture</strong></div>
          <div className="source-line"><span>Method</span><strong>Observation before conclusion</strong></div>
        </div>
      </section>
      <section className="principles" aria-labelledby="three-lenses">
        <p className="eyebrow">Three lenses</p><h2 id="three-lenses">A whole-canon Scripture instrument—including the Apocrypha—built for attention</h2>
        <div className="principle-grid">{principles.map(([title, body], index) => <article key={title}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>
      <section className="library" aria-labelledby="library-title">
        <p className="eyebrow">{releaseContent.home.libraryEyebrow}</p>
        <h2 id="library-title">{releaseContent.home.libraryTitle}</h2>
        <p className="library-stats">{releaseContent.home.libraryStats.map((stat) => <span key={stat}>{stat}</span>)}</p>
        <p>{releaseContent.home.libraryNote}</p>
      </section>
      <section className="positioning"><div><p className="eyebrow">A different posture</p><h2>{releaseContent.home.positioningTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2></div><p>{releaseContent.home.positioningBody}</p></section>
      <section className="included" aria-labelledby="included-title"><div><p className="eyebrow">Included</p><h2 id="included-title">One instrument.<br />Local Scripture.<br />No reader account.</h2></div><ul>{releaseContent.home.included.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <OwnershipPromise />
    </main></SiteShell>
  );
}
