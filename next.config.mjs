/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['exceljs', 'pdf-lib', 'fflate'],
  turbopack: {},
};

export default nextConfig;

