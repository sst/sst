/// <reference types="vitest" />

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "./test",
  },
  esbuild: {
    sourcemap: "both",
  },
});
