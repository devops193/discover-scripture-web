import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/about', '/privacy', '/terms', '/support'].map(path => ({ url: `https://www.dscripture.com${path}` }));
}
