import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@tracker/db",
    include: ["src/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    poolOptions: { forks: { singleFork: false } },
  },
});
