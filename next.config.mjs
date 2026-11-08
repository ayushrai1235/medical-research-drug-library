/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['exceljs', 'pdf-lib', 'fflate'],
  turbopack: {},
  async headers() {
    return [
      {
        // Safe revalidation strategy for unversioned static PDF worker
        // Caches in browser for 24 hours with 7 days background stale-while-revalidate,
        // preventing version mismatch lock-in on future pdfjs-dist library updates.
        source: '/pdf.worker.min.mjs',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // Immutable cache rule for version-tagged or content-hashed worker assets
        source: '/pdf.worker.:version(.*).min.mjs',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

