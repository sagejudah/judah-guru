/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static PWAs are served from /public. Keep their clean paths working.
  async rewrites() {
    return [
      { source: '/randomizer', destination: '/randomizer/index.html' },
      { source: '/randomizer/', destination: '/randomizer/index.html' },
      { source: '/30seconds', destination: '/30seconds/index.html' },
      { source: '/30seconds/', destination: '/30seconds/index.html' },
    ];
  },
};

module.exports = nextConfig;
