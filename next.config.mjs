/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Narrow patterns rather than wildcard hosts - the image optimiser is a
    // remote-fetch surface, so it stays on a leash.
    remotePatterns: [
      {
        // Product photography for the seed catalogue.
        protocol: "https",
        hostname: "cdn.dummyjson.com",
        pathname: "/product-images/**",
      },
      {
        // Book jackets, looked up by title at generation time.
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/b/id/**",
      },
    ],
  },
};

export default nextConfig;
