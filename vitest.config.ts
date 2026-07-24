import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tests run in Node against the in-memory Store — no database required.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
