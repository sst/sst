import { defineConfig } from "astro/config";
import aws from "astro-sst/lambda";

export default defineConfig({
  output: "server",
  adapter: aws(),
});
