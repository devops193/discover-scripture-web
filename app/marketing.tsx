import Link from 'next/link';
import type { ReactNode } from 'react';
import { publicationsFor, type FeaturePublication, type PublicationState } from './featurePublications';

export const LIVE_APP_URL = '/product-app/';
export const APP_STORE_URL = 'https://apps.apple.com/us/app/scripture-discovery/id6810717915';

export function StateBadge({ state }: { state: PublicationState }) {
  return <span className={`gtm-state gtm-state-${state.toLowerCase()}`}>{state}</span>;
}

export function ProductVisual({ src, alt, width, height, priority = false, className = '' }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={`gtm-visual ${className}`.trim()}>
      {/* Real product captures retain their exact artwork and proportions. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} />
    </figure>
  );
}

function FeatureCard({ feature }: { feature: FeaturePublication }) {
  return (
    <article className="gtm-feature-card">
      <ProductVisual src={feature.imageOrDemo} alt={feature.imageAlt} width={feature.imageWidth} height={feature.imageHeight} className="gtm-feature-visual" />
      <div className="gtm-feature-copy">
        <div className="gtm-feature-heading">
          <h3>{feature.publicName}</h3>
          {feature.publicationState === 'PILOT' ? null : <StateBadge state={feature.publicationState} />}
        </div>
        <p>{feature.shortStatement}</p>
        <Link className="gtm-text-link" href={feature.destination}>Open feature</Link>
      </div>
    </article>
  );
}

export function ScriptureFeatureGallery() {
  return <div className="gtm-feature-grid">{publicationsFor('Scripture Discovered').map((feature) => <FeatureCard feature={feature} key={feature.featureId} />)}</div>;
}

export function SectionActions({ children }: { children: ReactNode }) {
  return <div className="gtm-actions">{children}</div>;
}
