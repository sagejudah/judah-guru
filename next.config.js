/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static PWAs are served from /public. Keep their clean paths working.
  async rewrites() {
    return [
      { source: '/randomizer', destination: '/randomizer/index.html' },
      { source: '/randomizer/', destination: '/randomizer/index.html' },
      { source: '/30seconds', destination: '/30seconds/index.html' },
      { source: '/30seconds/', destination: '/30seconds/index.html' },
      { source: '/quiz', destination: '/quiz/index.html' },
      { source: '/quiz/', destination: '/quiz/index.html' },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://open.spotify.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "frame-src https://open.spotify.com",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
