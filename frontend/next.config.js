/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    REALTIME_SERVER_URL: process.env.REALTIME_SERVER_URL || 'http://localhost:4000',
  },
};

module.exports = nextConfig;
