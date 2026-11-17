import { defineConfig } from "vite";

// Primary build is scripts/build.mjs (multi-entry Chrome extension).
// This file keeps IDE / tooling happy.
export default defineConfig({
  build: {
    outDir: "dist",
  },
});
