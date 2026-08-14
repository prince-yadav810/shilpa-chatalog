/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.dmart.in", pathname: "/**" },
      { protocol: "https", hostname: "cdn.shopify.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.grofers.com", pathname: "/**" },
      { protocol: "https", hostname: "*.grofers.com", pathname: "/**" },
      { protocol: "https", hostname: "*.dmart.in", pathname: "/**" },
      { protocol: "https", hostname: "*.shopify.com", pathname: "/**" },
      { protocol: "https", hostname: "*.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
