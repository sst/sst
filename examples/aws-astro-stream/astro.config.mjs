// @ts-check
import aws from "astro-sst";
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: aws({
    responseMode: "stream",
  }),
});
