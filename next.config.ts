import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mysql2', 'bcryptjs', 'jsonwebtoken']
  },
  webpack: (config: any) => {
    config.externals.push({
      'mysql2': 'commonjs mysql2',
      'bcryptjs': 'commonjs bcryptjs',
      'jsonwebtoken': 'commonjs jsonwebtoken'
    })
    return config
  }
};

export default nextConfig;
