import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@tracker/dashboard",
    include: ["src/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
