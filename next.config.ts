import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mysql2', 'bcryptjs', 'jsonwebtoken', 'tesseract.js'],
  webpack: (config: any) => {
    config.externals.push({
      'mysql2': 'commonjs mysql2',
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
