import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@tracker/daemon",
    include: ["src/**/*.test.ts"],
    environment: "node",
    pool: "forks",
  },
});
