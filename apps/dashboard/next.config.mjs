const nextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
