import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent browsers from MIME-sniffing the content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding in iframes (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only origin (no path/query) in Referer header to third-party sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser feature access.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Force HTTPS for 2 years (production only — harmless on localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Basic XSS filter (belt-and-suspenders; real protection comes from CSP).
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Content Security Policy — restricts where scripts, styles, and resources can load from.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.tile.openstreetmap.org",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Use standalone output for Docker builds; Vercel uses its own bundler.
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        // Apply to all routes.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
