import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import viteSentry from "vite-plugin-sentry";

// https://docs.netlify.com/configure-builds/environment-variables/#build-metadata
if (process.env.NETLIFY) process.env.VITE_SENTRY_RELEASE = process.env.BUILD_ID;

export default defineConfig({
  plugins: [
    react(),
    viteSentry({
      debug: true,
      authToken: process.env.SENTRY_TOKEN,
      org: "serverless_stack",
      project: "console",
      release: process.env.VITE_SENTRY_RELEASE,
      deploy: {
        env: "production",
      },
      setCommits: {
        auto: true,
        ignoreMissing: true,
      },
      sourceMaps: {
        include: ["./dist"],
      },
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
  },
});
