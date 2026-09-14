/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Seed catalogue images only. Narrow patterns rather than a wildcard host -
    // the image optimiser is a remote-fetch surface, so it stays on a leash.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/seed/**",
      },
    ],
  },
};

export default nextConfig;
