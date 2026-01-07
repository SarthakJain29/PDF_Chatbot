/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@my-scope/shared"],
};

module.exports = nextConfig;
