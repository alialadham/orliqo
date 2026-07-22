import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest.setup.ts"),
    },
  },
  test: {
    environment: "jsdom",
    fileParallelism: false,
    globals: true,
    maxWorkers: 1,
    pool: "threads",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next", "tests/e2e"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
