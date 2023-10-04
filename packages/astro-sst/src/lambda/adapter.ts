import type { AstroAdapter, AstroIntegration } from "astro";
import { BuildMeta } from "../lib/build-meta";

const PACKAGE_NAME = "astro-sst/lambda";

function getAdapter(): AstroAdapter {
  return {
    name: PACKAGE_NAME,
    serverEntrypoint: `${PACKAGE_NAME}/entrypoint`,
    exports: ["handler"],
    adapterFeatures: {
      edgeMiddleware: false,
      functionPerRoute: false,
    },
    supportedAstroFeatures: {
      staticOutput: "stable",
      hybridOutput: "stable",
      serverOutput: "stable",
      assets: {
        supportKind: "stable",
        isSharpCompatible: true,
        isSquooshCompatible: true,
      },
    },
  };
}

export default function createIntegration(): AstroIntegration {
  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:done": ({ config, setAdapter }) => {
        BuildMeta.setAstroConfig(config);
        setAdapter(getAdapter());
      },
      "astro:build:done": async (buildResults) => {
        BuildMeta.setBuildResults(buildResults);
        await BuildMeta.exportBuildMeta();
      },
    },
  };
}
