import type { AstroAdapter, AstroIntegration } from "astro";
import { BuildMeta, IntegrationConfig } from "../lib/build-meta.js";

const PACKAGE_NAME = "astro-sst/static";

function getAdapter(): AstroAdapter {
  return {
    name: PACKAGE_NAME,
    adapterFeatures: {
      edgeMiddleware: false,
      functionPerRoute: false,
    },
    supportedAstroFeatures: {
      staticOutput: "stable",
      hybridOutput: "unsupported",
      serverOutput: "unsupported",
      assets: {
        supportKind: "unsupported",
        isSharpCompatible: false,
        isSquooshCompatible: false,
      },
    },
  };
}

export default function createIntegration({
  serverRoutes,
}: {
  serverRoutes?: string[];
} = {}): AstroIntegration {
  const integrationConfig: IntegrationConfig = {
    responseMode: "buffer",
    serverRoutes: serverRoutes ?? [],
  };

  BuildMeta.setIntegrationConfig(integrationConfig);

  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:done": ({ config, setAdapter }) => {
        if (config.output !== "static") {
          throw new Error(
            `Only static output is supported by '${PACKAGE_NAME}'. Use the 'astro-sst/lambda' or 'astro-sst/edge' integrations instead.`
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
