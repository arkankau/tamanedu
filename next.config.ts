import type { NextConfig } from "next";
import path from 'path'

const nextConfig: NextConfig = {
  // Ensure Next.js uses the project root (not parent folder lockfiles)
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken'],
  webpack: (config: any) => {
    config.externals.push({
      'bcryptjs': 'commonjs bcryptjs',
      'jsonwebtoken': 'commonjs jsonwebtoken'
    })
    
    // Fix for Tesseract.js worker issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }
    
    return config
  }
};

export default nextConfig;
