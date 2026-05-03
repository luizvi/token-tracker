import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(__dirname, "../../"),
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
