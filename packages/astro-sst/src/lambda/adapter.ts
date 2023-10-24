import type { AstroAdapter, AstroIntegration } from "astro";
import type { ResponseMode } from "../lib/types.js";
import { BuildMeta, IntegrationConfig } from "../lib/build-meta.js";

const PACKAGE_NAME = "astro-sst/lambda";

function getAdapter({
  responseMode,
}: {
  responseMode: ResponseMode;
}): AstroAdapter {
  return {
    name: PACKAGE_NAME,
    serverEntrypoint: `${PACKAGE_NAME}/entrypoint`,
    args: { responseMode },
    exports: ["handler"],
    adapterFeatures: {
      edgeMiddleware: false,
      functionPerRoute: false,
    },
    supportedAstroFeatures: {
      staticOutput: "unsupported",
      hybridOutput: "stable",
      serverOutput: "stable",
      assets: {
        supportKind: "experimental",
        isSharpCompatible: true,
        isSquooshCompatible: true,
      },
    },
  };
}

export default function createIntegration({
  responseMode,
  serverRoutes,
}: {
  responseMode?: ResponseMode;
  serverRoutes?: string[];
} = {}): AstroIntegration {
  const integrationConfig: IntegrationConfig = {
    responseMode: responseMode ?? "buffer",
    serverRoutes: serverRoutes ?? [],
  };

  BuildMeta.setIntegrationConfig(integrationConfig);

  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:done": ({ config, setAdapter }) => {
        if (config.output === "static") {
          throw new Error(
            `Static output is not supported by '${PACKAGE_NAME}'. Use the 'astro-sst/static' integration instead.`
          );
        }

        BuildMeta.setAstroConfig(config);
        setAdapter(
          getAdapter({
            responseMode: integrationConfig.responseMode,
          })
        );
      },
      "astro:build:done": async (buildResults) => {
        BuildMeta.setBuildResults(buildResults);
        await BuildMeta.exportBuildMeta();
      },
    },
  };
}
