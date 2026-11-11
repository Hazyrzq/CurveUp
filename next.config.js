/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Keep the former Indonesian dashboard URLs working by redirecting them to the English routes.
  async redirects() {
    return [
      { source: '/dashboard/manajemen/import-rab', destination: '/dashboard/management/import-cost-estimate', permanent: true },
      { source: '/dashboard/mandor/laporan-baru', destination: '/dashboard/foreman/new-report', permanent: true },
      { source: '/dashboard/manajemen/:path*', destination: '/dashboard/management/:path*', permanent: true },
      { source: '/dashboard/pengawas/:path*', destination: '/dashboard/supervisor/:path*', permanent: true },
      { source: '/dashboard/mandor/:path*', destination: '/dashboard/foreman/:path*', permanent: true },
    ];
  },
};

module.exports = nextConfig;
