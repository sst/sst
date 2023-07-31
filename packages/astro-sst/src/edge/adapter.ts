import type { AstroAdapter, AstroIntegration } from "astro";
import { BuildProps } from "../lib/buildProps";

const PACKAGE_NAME = "astro-sst/edge";

function getAdapter(): AstroAdapter {
  return {
    name: PACKAGE_NAME,
    serverEntrypoint: `${PACKAGE_NAME}/entrypoint`,
    exports: ["handler"],
  };
}

export default function createIntegration(): AstroIntegration {
  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:done": ({ config, setAdapter }) => {
        BuildProps.setAstroConfig(config);
        setAdapter(getAdapter());
      },
      "astro:build:done": async (buildResults) => {
        BuildProps.setBuildResults(buildResults);
        await BuildProps.exportBuildProps();
      },
    },
  };
}
