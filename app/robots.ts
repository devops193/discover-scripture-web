import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/portal/', '/product-app/digital-altar/', '/product-app/c3/'] }, sitemap: 'https://www.dscripture.com/sitemap.xml' };
}
