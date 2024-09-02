import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  deployment: {
    preset: "aws-lambda",
  },
  vite: {
    plugins: () => [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
});
