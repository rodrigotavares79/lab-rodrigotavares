/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/condominio/dashboard",
        destination: "/condominio/relatorios",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
