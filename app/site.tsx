import Link from 'next/link';
import type { ReactNode } from 'react';
import { APP_STORE_URL } from './platform';
import { publicReleaseConfig } from './releaseConfig.generated';
import { releaseContent } from './releaseContent.generated';
import { StoreLinks } from './storeLinks';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        {/* Native home links so the logo and section titles navigate from every page, including About, Privacy, Terms, and Support. */}
        {/* eslint-disable @next/next/no-html-link-for-pages */}
        <a className="brand" href="/" aria-label="Discover Scripture home"><img className="brand-logo" src="/Dscrip_web_logo.png" alt="" width={44} height={44} /><span>Discover Scripture</span></a>
        <nav aria-label="Primary navigation">
          <a href="/#church-edition-summary">Scripture Discovery CE</a>
          <a href="/#commander-ce">Commander CE</a>
          <a href="/#personal-edition">Scripture Discovery PE</a>
          <a className="button nav-cta" href="/church-edition#pilot">Request a Pilot</a>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <div className="footer-col">
          <a href="/#personal-edition">Scripture Discovery PE</a>
          <a className="footer-emphasis" href={APP_STORE_URL} rel="noopener noreferrer" target="_blank">Download on the App Store<span className="sr-only"> (opens in a new tab)</span></a>
          <a className="footer-group" href="/#church-edition-summary">Scripture Discovery CE</a>
          <a className="footer-group" href="/#commander-ce">Commander CE</a>
          <span className="footer-status">Pilot deployments</span>
        </div>
        <nav className="footer-col" aria-label="Legal and support">
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/support">Support</a>
        </nav>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
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
    .replaceAll('{{DEVELOPER_LEGAL_NAME}}', publicReleaseConfig.developerLegalName ?? 'Developer legal name pending release configuration');
}

function DocumentParagraph({ value }: { value: string }) {
  const text = releaseDocumentText(value);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return <p><a href={`mailto:${text}`}>{text}</a></p>;
  }

  const nodes: ReactNode[] = [];
  const pattern = /Privacy Policy|Terms & Conditions/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const href = match[0] === 'Privacy Policy' ? '/privacy' : '/terms';
    nodes.push(<Link href={href} key={key++}>{match[0]}</Link>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return <p>{nodes.length ? nodes : text}</p>;
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
            {section.paragraphs.map((paragraph) => (
              <DocumentParagraph key={paragraph} value={paragraph} />
            ))}
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
          <div><dt>Full Pack</dt><dd>{publicReleaseConfig.ultimatePriceDisplay}</dd></div>
        </dl>
      ) : <p className="release-pending">Approved launch and ultimate prices will appear here together before public release.</p>}
      <StoreLinks />
    </section>
  );
}
