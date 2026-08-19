/** @type {import('next').NextConfig} */
const nextConfig = {
  // /randomizer is a self-contained static PWA sitting in /public/randomizer.
  // Its manifest.json uses scope "/randomizer/", so both the bare path and the
  // trailing-slash path need to resolve to that folder's index.html.
  async rewrites() {
    return [
      { source: '/randomizer', destination: '/randomizer/index.html' },
      { source: '/randomizer/', destination: '/randomizer/index.html' },
    ];
  },
};

module.exports = nextConfig;
