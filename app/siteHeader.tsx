export function SiteHeader() {
  return <header className="site-header reset-header">
    {/* Preserve the existing full-page navigation and brand asset. */}
    {/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */}
    <a className="brand" href="/" aria-label="Discover Scripture home"><img className="brand-logo" src="/Dscrip_web_logo.png" alt="" width={36} height={36} /><span>Discover Scripture</span></a>
    <a className="reset-open" href="/product-app/">Explore Discover</a>
  </header>;
}
