import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(__dirname, "../../"),
  transpilePackages: ["@tracker/db", "@tracker/shared", "@tracker/daemon"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  serverExternalPackages: ["better-sqlite3", "bindings", "file-uri-to-path"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean);
      config.externals = [
        ...externals,
        ({ request }, callback) => {
          if (request === "better-sqlite3" || request === "bindings" || request === "file-uri-to-path") {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
