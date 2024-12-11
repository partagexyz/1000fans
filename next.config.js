/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// nextjs's redirects for SEO to prevent broken links
module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true,
      },
    ]
  },
}