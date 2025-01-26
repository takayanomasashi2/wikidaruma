/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  redirects: async () => [
    {
      source: "/github",
      destination: "https://github.com/steven-tey/novel",
      permanent: true,
    },
    {
      source: "/sdk",
      destination: "https://www.npmjs.com/package/novel",
      permanent: true,
    },
    {
      source: "/npm",
      destination: "https://www.npmjs.com/package/novel",
      permanent: true,
    },
    {
      source: "/svelte",
      destination: "https://github.com/tglide/novel-svelte",
      permanent: false,
    },
    {
      source: "/vue",
      destination: "https://github.com/naveennaidu/novel-vue",
      permanent: false,
    },
    {
      source: "/vscode",
      destination:
        "https://marketplace.visualstudio.com/items?itemName=bennykok.novel-vscode",
      permanent: false,
    },
    {
      source: "/feedback",
      destination: "https://github.com/steven-tey/novel/issues",
      permanent: true,
    },
    {
      source: "/deploy",
      destination: "https://vercel.com/templates/next.js/novel",
      permanent: true,
    },
  ],
  headers: async () => [
    {
      source: "/opengraph-image.png",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
        {
          key: "Pragma",
          value: "no-cache",
        },
        {
          key: "Expires",
          value: "0",
        },
      ],
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/a/**",
      },
    ],
  },
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
