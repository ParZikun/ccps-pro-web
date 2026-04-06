/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // When your frontend asks for anything starting with /api/backend/
        source: '/api/backend/:path*', 
        
        // Vercel's server will secretly fetch it from your Azure VM over HTTP
        destination: `${process.env.AZURE_BACKEND_URL}/:path*`, 
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'store.collectorcrypt.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: '*.arweave.net' },
      { protocol: 'https', hostname: 'cdn.prod.website-files.com' },
      { protocol: 'https', hostname: 'www.marketbeat.com' },
      { protocol: 'https', hostname: 'magiceden-launchpad.mypinata.cloud' },
      { protocol: 'https', hostname: '*.mypinata.cloud' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
    dangerouslyAllowSVG: true,
  }
}

module.exports = nextConfig
