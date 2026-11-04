/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // pdfjs optionally requires `canvas` in Node; we only use it in the browser.
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  }
}
export default config
