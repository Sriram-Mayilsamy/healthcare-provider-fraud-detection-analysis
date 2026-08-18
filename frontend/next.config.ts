import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const mlApiUrl = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000"

    return [
      {
        source: "/ml/:path*",
        destination: `${mlApiUrl}/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
