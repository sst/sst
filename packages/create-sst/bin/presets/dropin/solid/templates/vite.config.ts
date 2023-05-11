import solid from "solid-start/vite";
import aws from "solid-start-sst";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid({ adapter: aws() })],
  optimizeDeps: { exclude: ["sst"] },
});
