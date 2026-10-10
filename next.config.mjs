/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Cache les images de produit 30 jours
        source: '/api/product-image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400, immutable',
          },
        ],
      },
      {
        // Cache les images publiques (placeholder, logos)
        source: '/:path*.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/boutique',
        destination: '/tienda',
        permanent: true,
      },
      {
        source: '/boutique/:path*',
        destination: '/tienda/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
