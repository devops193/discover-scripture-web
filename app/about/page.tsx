import type { Metadata } from 'next';
import { SiteShell } from '../site';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <SiteShell><main className="document-page">
      <p className="eyebrow">Discover Scripture</p>
      <h1>A calm instrument for reading closely</h1>
      <p className="document-intro">This application is crafted for the exploration of Scripture. The focus is on developing methods that facilitate easier exploration, analysis, connection, and in-depth examination of biblical texts. Discover Scripture emerged from this endeavor: a software tool designed to provide readers with access to advanced Scripture investigation methods without complicating the process.</p>
      <section className="document-section">
        <h2>The objective</h2>
        <p>The goal of Discover is clear: to make thorough Scripture investigation more accessible. The software is intended to assist readers in exploring individuals, events, concepts, passages, relationships, patterns, and source evidence throughout Scripture; analyzing the content of the text; and uncovering connections that may be challenging to identify when passages are read separately. The intention is not to simplify Scripture but to make deeper investigation more manageable.</p>
      </section>
      <section className="document-section">
        <h2>Product philosophy</h2>
        <p>Discover serves as an instrument for Scripture investigation, not as an interpreter. It offers tools for analytics, dissection, comparison, tracing, questioning, and evidence examination. These tools help reveal the content of the text, the relationships between passages, the occurrence of patterns, and the questions raised by the evidence. Organizing Scripture is not the same as interpreting it. Comparing passages is not interpreting them. Asking a question does not provide its answer. Discover is designed to assist readers in examining the evidence necessary to pursue the meaning of Scripture through Scripture itself.</p>
        <p className="about-creed">
          <span>The instrument investigates.</span>
          <span>Scripture provides the evidence.</span>
          <span>The reader concludes.</span>
        </p>
      </section>
      <section className="document-section">
        <h2>Independent development</h2>
        <p>Discover Scripture is independently designed, developed, and published. The work progresses through enhancements to the investigation system, expansion of the Scripture library, and the addition of new Discover content packs over time.</p>
      </section>
    </main></SiteShell>
  );
}
