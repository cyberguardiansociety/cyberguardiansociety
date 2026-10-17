/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      ...(process.env.NODE_ENV === 'development'
        ? [{ protocol: 'http', hostname: 'localhost' }]
        : []),
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/photo-*' },
    ],
  },
  serverExternalPackages: ['googleapis', 'sql.js'],
  // CI escape hatch: skip Next's in-build type-check step when the pipeline
  // already runs `npm run typecheck` (which checks frontend + backend).
  typescript: {
    ignoreBuildErrors: process.env.NEXT_IGNORE_TYPECHECK === '1',
  },
  async rewrites() {
    return [
      {
        source: '/admin/:section(overview|inbox|applications|speaker-applications|activity|sessions|time-management|attendance|registrants|google-sync|speakers|announcements|products|merchandise|resources|administrators|settings)',
        destination: '/admin?view=:section',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }]
            : []),
        ],
      },
    ]
  },
}

module.exports = nextConfig
