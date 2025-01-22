/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '1000fans-theosis.s3.amazonaws.com',
      },
    ],
  },
};

module.exports = nextConfig;