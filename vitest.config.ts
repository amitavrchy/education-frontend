import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    testTimeout: 20000,
    // Unit tests run against the in-browser mock layer.
    env: { NEXT_PUBLIC_USE_MOCK_API: "true" },
  },
});
