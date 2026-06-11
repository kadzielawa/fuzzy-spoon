/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => {
    // BACKEND_URL is a runtime env var set on the Cloud Run service.
    // Falls back to localhost:3001 for local development.
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;

