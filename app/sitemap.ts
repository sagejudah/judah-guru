import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://judah.guru';
  const now = new Date();
  return [
    { url: base, lastModified: now, priority: 1 },
    { url: `${base}/randomizer`, lastModified: now, priority: 0.7 },
    { url: `${base}/30seconds`, lastModified: now, priority: 0.7 },
    { url: `${base}/quiz`, lastModified: now, priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, priority: 0.3 },
  ];
}
