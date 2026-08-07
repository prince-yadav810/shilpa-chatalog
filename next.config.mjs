/** @type {import('next').NextConfig} */
const nextConfig = {
  // There are lockfiles further up the tree; pin the root so Next doesn't
  // infer the wrong one and mis-trace files at build time.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    // Cloudinary only. We own every product image — the demo whitelisted
    // third-party retail hosts and served their files directly, which breaks
    // the moment they change a URL.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
