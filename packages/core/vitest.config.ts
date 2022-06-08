/// <reference types="vitest" />

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 90000,
  },
  resolve: {
    alias: {
      "@serverless-stack/core": "./src",
    },
  },
});
