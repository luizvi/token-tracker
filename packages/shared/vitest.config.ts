import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@tracker/shared",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
