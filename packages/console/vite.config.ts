import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import viteSentry from "vite-plugin-sentry";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteSentry({
      debug: true,
      authToken: process.env.SENTRY_TOKEN,
      org: "serverless_stack",
      project: "console",
      deploy: {
        env: "production",
      },
      setCommits: {
        auto: true,
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
