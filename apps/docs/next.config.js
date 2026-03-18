/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ------------------------------------------------------------------ */
  /*  Output                                                             */
  /* ------------------------------------------------------------------ */

  /*
   * Static export — the docs site is entirely static content.
   * Deploy to Cloudflare Pages, Vercel, Netlify, or any CDN.
   * For Fly.io, switch to 'standalone' and serve via Node.
   */
  output: "export",

  /* Trailing slashes for clean static paths (/docs/ → docs/index.html) */
  trailingSlash: true,

  /* ------------------------------------------------------------------ */
  /*  Images                                                             */
  /* ------------------------------------------------------------------ */

  images: {
    /* Static export requires unoptimized images */
    unoptimized: true,
  },

  /* ------------------------------------------------------------------ */
  /*  Environment                                                        */
  /* ------------------------------------------------------------------ */

  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://xrnotify.dev",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://api.xrnotify.io",
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.xrnotify.io",
  },

  /* ------------------------------------------------------------------ */
  /*  Redirects (dev server only — static export uses _redirects file)   */
  /* ------------------------------------------------------------------ */

  async redirects() {
    return [
      {
        source: "/",
        destination: "/docs/",
        permanent: false,
      },
    ];
  },

  /* ------------------------------------------------------------------ */
  /*  Headers (dev server only — prod via CDN/reverse proxy)             */
  /* ------------------------------------------------------------------ */

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        /* Cache static assets aggressively */
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  /* ------------------------------------------------------------------ */
  /*  Webpack                                                            */
  /* ------------------------------------------------------------------ */

  webpack: (config) => {
    /* Allow importing .md files as raw strings */
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });

    return config;
  },

  /* ------------------------------------------------------------------ */
  /*  TypeScript / ESLint                                                */
  /* ------------------------------------------------------------------ */

  typescript: {
    /* Build proceeds even with type errors — CI catches them separately */
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  /* ------------------------------------------------------------------ */
  /*  Experimental                                                       */
  /* ------------------------------------------------------------------ */

  experimental: {
    /* Faster dev compilation */
    webpackBuildWorker: true,
  },
};

module.exports = nextConfig;
