'use client';
import { useState } from 'react';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header" data-menu-open={open}>
    {/* Full-page site links retain the existing site's navigation semantics. */}
    {/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */}
    <a className="brand" href="/" aria-label="Discover Scripture home"><img className="brand-logo" src="/Dscrip_web_logo.png" alt="" width={44} height={44} /><span>Discover Scripture</span></a>
    <button className="site-menu-toggle" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>Menu</button>
    <nav id="site-navigation" aria-label="Primary navigation" onClick={() => setOpen(false)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
      <a href="/#church-edition-summary">Scripture Discovery CE</a>
      <a href="/#commander-ce">Commander CE</a>
      <a href="/#personal-edition">Scripture Discovery PE</a>
      <a className="button nav-cta" href="/church-edition#pilot">Request a Pilot</a>
    </nav>
  </header>;
}
