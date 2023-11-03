import type { AstroIntegration } from "astro";
import defaultIntegration from "../adapter.js";

export default function createIntegration({} = {}): AstroIntegration {
  console.warn(
    `**************************************************************************
| !!! DEPRECATION WARNING !!!!
| The 'astro-sst/edge' adapter is deprecated.
| Please use 'astro-sst' adapter instead.
| -----------------------------------------------------------------------
| import aws from "astro-sst";
|
| export default defineConfig({
|   adapter: aws({
|     deploymentStrategy: "edge",
|   }),  
| })
**************************************************************************`
  );

  return defaultIntegration({
    deploymentStrategy: "edge",
    responseMode: "buffer",
  });
}
