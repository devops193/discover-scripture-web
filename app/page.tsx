import { releaseContent } from './releaseContent.generated';
import { OwnershipPromise, SiteShell } from './site';

const principles = [
  ['Follow', 'People through changing places, relationships, decisions, pressure, failure, and memory.'],
  ['Enter', 'Events as complete scenes with people, actions, tensions, consequences, and source evidence.'],
  ['Trace', 'Ideas and patterns as they move through different voices and moments in Scripture.'],
] as const;

export default function Home() {
  return (
    <SiteShell><main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">{releaseContent.home.eyebrow}</p><h1>{releaseContent.home.title}</h1><p className="hero-lead">{releaseContent.home.lead}</p></div>
        <div className="instrument-card" aria-label="A sample Scripture investigation">
          <p className="eyebrow">Look again</p><blockquote>“What becomes visible when the passages are held together?”</blockquote>
          <div className="source-line"><span>Source</span><strong>Inspectable Scripture</strong></div>
          <div className="source-line"><span>Method</span><strong>Observation before conclusion</strong></div>
        </div>
      </section>
      <section className="principles" aria-labelledby="three-lenses">
        <p className="eyebrow">Three lenses</p><h2 id="three-lenses">A whole-canon instrument built for attention</h2>
        <div className="principle-grid">{principles.map(([title, body], index) => <article key={title}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>
      <section className="positioning"><div><p className="eyebrow">A different posture</p><h2>{releaseContent.home.positioningTitle}</h2></div><p>{releaseContent.home.positioningBody}</p></section>
      <section className="included" aria-labelledby="included-title"><div><p className="eyebrow">Included</p><h2 id="included-title">One instrument. Local Scripture. No reader account.</h2></div><ul>{releaseContent.home.included.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <OwnershipPromise />
    </main></SiteShell>
  );
}
