/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Narrow patterns rather than wildcard hosts - the image optimiser is a
    // remote-fetch surface, so it stays on a leash.
    remotePatterns: [
      {
        // Product photography for most subcategories.
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
      {
        // Hand-picked images for subcategories dummyjson has no product for
        // (hoodies, jeans, socks, routers, mops...).
        protocol: "https",
        hostname: "thumb.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      {
        // Labelled placeholder, used only where no reliable photo exists.
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
