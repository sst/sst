import type { AstroAdapter, AstroIntegration } from "astro";
import type { ResponseMode } from "../lib/types.js";
import { BuildMeta, IntegrationConfig } from "../lib/build-meta.js";

const PACKAGE_NAME = "astro-sst/lambda";

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
