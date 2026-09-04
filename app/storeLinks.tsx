import { publicReleaseConfig } from './releaseConfig.generated';

export type StorePlatform = 'apple' | 'google';
export type StoreLinkState = 'LIVE' | 'PRELAUNCH';

export type PublicStoreLink = {
  platform: StorePlatform;
  state: StoreLinkState;
  href: string | null;
};

const PLACEHOLDER_HINTS = [
  'placeholder',
  'example.com',
  'example.org',
  'localhost',
  '127.0.0.1',
  'appstoreconnect.apple.com',
  'play.google.com/console',
  'play.google.com/apps/publish',
  'itunes.apple.com/search',
  'google.com/search',
];

function rawStoreUrl(platform: StorePlatform): string | null {
  const fromEnv = platform === 'apple' ? process.env.APP_STORE_URL : process.env.GOOGLE_PLAY_URL;
  const fromConfig = platform === 'apple' ? publicReleaseConfig.appStoreUrl : publicReleaseConfig.playStoreUrl;
  const candidate = (fromEnv ?? fromConfig ?? '').trim();
  return candidate.length > 0 ? candidate : null;
}

function isPlaceholder(value: string): boolean {
  const lowered = value.toLowerCase();
  return PLACEHOLDER_HINTS.some((hint) => lowered.includes(hint));
}

function isPublicAppleListing(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname.toLowerCase();
  if (host === 'apps.apple.com' || host === 'itunes.apple.com') {
    return path.includes('/app/') && /\/id\d+/i.test(path);
  }
  return false;
}

function isPublicGoogleListing(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'play.google.com') return false;
  if (!url.pathname.toLowerCase().startsWith('/store/apps/details')) return false;
  return Boolean(url.searchParams.get('id')?.trim().length);
}

export function validatePublicStoreUrl(platform: StorePlatform, value: string): string {
  if (isPlaceholder(value)) {
    throw new Error(`Invalid ${platform} store URL: placeholders and dashboard links are not allowed.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid ${platform} store URL.`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`Invalid ${platform} store URL: only https public listing URLs are allowed.`);
  }
  const publicListing = platform === 'apple' ? isPublicAppleListing(parsed) : isPublicGoogleListing(parsed);
  if (!publicListing) {
    throw new Error(`Invalid ${platform} store URL: not a public customer-facing product listing.`);
  }
  return parsed.toString();
}

export function resolvePublicStoreLink(platform: StorePlatform): PublicStoreLink {
  const raw = rawStoreUrl(platform);
  if (!raw) return { platform, state: 'PRELAUNCH', href: null };
  return { platform, state: 'LIVE', href: validatePublicStoreUrl(platform, raw) };
}

export function resolvePublicStoreLinks() {
  return {
    apple: resolvePublicStoreLink('apple'),
    google: resolvePublicStoreLink('google'),
  };
}

const APPLE_BADGE = 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83';
const GOOGLE_BADGE = 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

function StoreDestination({ link }: { link: PublicStoreLink }) {
  if (link.state === 'PRELAUNCH') {
    return (
      <p className="store-availability">
        {link.platform === 'apple' ? 'Coming to the App Store' : 'Coming to Google Play'}
      </p>
    );
  }
  const apple = link.platform === 'apple';
  return (
    <a
      className={apple ? 'store-badge store-badge-apple' : 'store-badge store-badge-google'}
      href={link.href!}
      rel="noopener noreferrer"
      target="_blank"
      aria-label={apple ? 'Download Discover Scripture on the App Store' : 'Get Discover Scripture on Google Play'}
    >
      {/* Official platform badges must keep their published artwork unmodified. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={apple ? APPLE_BADGE : GOOGLE_BADGE}
        alt={apple ? 'Download on the App Store' : 'Get it on Google Play'}
        height={apple ? 40 : 48}
      />
    </a>
  );
}

export function StoreLinks() {
  const { apple, google } = resolvePublicStoreLinks();
  return (
    <div className="store-links">
      <StoreDestination link={apple} />
      <StoreDestination link={google} />
    </div>
  );
}
