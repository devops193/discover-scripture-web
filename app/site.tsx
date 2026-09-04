import Link from 'next/link';
import { publicReleaseConfig } from './releaseConfig.generated';
import { releaseContent } from './releaseContent.generated';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      {!publicReleaseConfig.publicationReady ? <div className="preview-banner" role="status">Private release preview · public publication is blocked pending approval</div> : null}
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Discover Scripture home"><span className="brand-mark" aria-hidden="true">✦</span><span>Discover Scripture</span></Link>
        <nav aria-label="Primary navigation"><Link href="/about">About</Link><Link href="/support">Support</Link></nav>
      </header>
      {children}
      <footer className="site-footer">
        <div><strong>Discover Scripture</strong><p>Scripture is the content. Discovery is the product.</p></div>
        <nav aria-label="Legal and support"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></nav>
      </footer>
    </div>
  );
}

export type ReleaseDocument = {
  title: string;
  status?: string;
  documentVersion: string;
  effectiveDate: string;
  lastUpdated: string;
  intro: string;
  sections: readonly { title: string; paragraphs: readonly string[] }[];
};

function releaseDocumentText(value: string) {
  return value
    .replaceAll('{{LAUNCH_DATE}}', publicReleaseConfig.launchDate ?? 'Pending launch configuration')
    .replaceAll('{{SUPPORT_EMAIL}}', publicReleaseConfig.supportEmail ?? 'Support email pending release configuration')
    .replaceAll('{{OPERATOR_LEGAL_NAME}}', publicReleaseConfig.operatorLegalName ?? 'Operator legal name pending release configuration');
}

export function DocumentPage({ document }: { document: ReleaseDocument }) {
  return (
    <SiteShell>
      <main className="document-page">
        <p className="eyebrow">Discover Scripture</p>
        <h1>{document.title}</h1>
        {document.status ? <p className="document-status">{document.status}</p> : null}
        <dl className="document-meta">
          <div><dt>Version</dt><dd>{document.documentVersion}</dd></div>
          <div><dt>Effective date</dt><dd>{releaseDocumentText(document.effectiveDate)}</dd></div>
          <div><dt>Last updated</dt><dd>{releaseDocumentText(document.lastUpdated)}</dd></div>
        </dl>
        <p className="document-intro">{releaseDocumentText(document.intro)}</p>
        {document.sections.map((section) => (
          <section className="document-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{releaseDocumentText(paragraph)}</p>)}
          </section>
        ))}
      </main>
    </SiteShell>
  );
}

export function OwnershipPromise() {
  return (
    <section className="ownership-card" aria-labelledby="ownership-title">
      <p className="eyebrow">Ownership</p>
      <h2 id="ownership-title">{releaseContent.commercialPromise}</h2>
      <p>{releaseContent.existingOwnerPromise}</p>
      <p>{releaseContent.futureEnhancementsPromise}</p>
      {publicReleaseConfig.pricesReady ? (
        <dl className="price-pair">
          <div><dt>Launch price</dt><dd>{publicReleaseConfig.launchPriceDisplay}</dd></div>
          <div><dt>Ultimate price</dt><dd>{publicReleaseConfig.ultimatePriceDisplay}</dd></div>
        </dl>
      ) : <p className="release-pending">Approved launch and ultimate prices will appear here together before public release.</p>}
      {publicReleaseConfig.storesReady ? (
        <div className="store-links">
          <a className="button" href={publicReleaseConfig.appStoreUrl!}>View on the App Store</a>
          <a className="button secondary" href={publicReleaseConfig.playStoreUrl!}>View on Google Play</a>
        </div>
      ) : null}
    </section>
  );
}
