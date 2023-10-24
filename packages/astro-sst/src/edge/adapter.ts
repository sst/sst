import type { AstroAdapter, AstroIntegration } from "astro";
import { BuildMeta, IntegrationConfig } from "../lib/build-meta";

const PACKAGE_NAME = "astro-sst/edge";

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
      staticOutput: "unsupported",
      hybridOutput: "unsupported",
      serverOutput: "stable",
      assets: {
        supportKind: "unsupported",
        isSharpCompatible: false,
        isSquooshCompatible: false,
      },
    },
  };
}

export default function createIntegration(): AstroIntegration {
  const integrationConfig: IntegrationConfig = {
    responseMode: "buffer",
    serverRoutes: [],
  };

  BuildMeta.setIntegrationConfig(integrationConfig);

  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:done": ({ config, setAdapter }) => {
        if (config.output === "static") {
          throw new Error(
            `Static output is not supported by ${PACKAGE_NAME}. Use the 'astro-sst/static' integration instead.`
          );
        }

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
