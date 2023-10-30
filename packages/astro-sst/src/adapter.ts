import type { AstroAdapter, AstroIntegration } from "astro";
import type {
  EntrypointParameters,
  ResponseMode,
  DeploymentStrategy,
} from "./lib/types.js";
import { BuildMeta, IntegrationConfig } from "./lib/build-meta.js";

const PACKAGE_NAME = "astro-sst";

function getAdapter({
  deploymentStrategy,
  responseMode,
}: {
  deploymentStrategy: DeploymentStrategy;
  responseMode: ResponseMode;
}): AstroAdapter {
  const isStatic = deploymentStrategy === "static";
  const isRegional = deploymentStrategy === "regional";

  const baseConfig: AstroAdapter = {
    name: PACKAGE_NAME,
    serverEntrypoint: `${PACKAGE_NAME}/entrypoint`,
    args: { responseMode },
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
        isSharpCompatible: isRegional,
        isSquooshCompatible: isRegional,
      },
    },
  };

  return !isStatic
    ? baseConfig
    : {
        name: baseConfig.name,
        supportedAstroFeatures: {
          ...baseConfig.supportedAstroFeatures,
          assets: {
            supportKind: "unsupported",
          },
        },
      };
}

export default function createIntegration({
  deploymentStrategy,
  responseMode,
  serverRoutes,
}: EntrypointParameters = {}): AstroIntegration {
  const integrationConfig: IntegrationConfig = {
    deploymentStrategy: deploymentStrategy ?? "regional",
    responseMode: responseMode ?? "buffer",
    serverRoutes: serverRoutes ?? [],
  };

  if (deploymentStrategy !== "regional" && responseMode === "stream") {
    throw new Error(
      `Deployment strategy ${deploymentStrategy} does not support streaming responses. Use 'buffer' response mode.`
    );
  }

  BuildMeta.setIntegrationConfig(integrationConfig);

  return {
    name: PACKAGE_NAME,
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        if (
          integrationConfig.deploymentStrategy !== "static" &&
          config.output === "static"
        ) {
          // If the user has not specified an output, we will allow the Astro config to override default deployment strategy.
          if (typeof deploymentStrategy === "undefined") {
            integrationConfig.deploymentStrategy = "static";
          } else {
            console.log(
              `[astro-sst] Overriding output to 'server' to support ${deploymentStrategy} deployment.`
            );
            updateConfig({
              output: "server",
            });
          }
        }

        if (
          integrationConfig.deploymentStrategy === "static" &&
          config.output !== "static"
        ) {
          console.log(
            `[astro-sst] Overriding output to 'static' to support ${deploymentStrategy} deployment.`
          );
          updateConfig({
            output: "static",
          });
        }
      },
      "astro:config:done": ({ config, setAdapter }) => {
        BuildMeta.setAstroConfig(config);
        setAdapter(
          getAdapter({
            deploymentStrategy: integrationConfig.deploymentStrategy,
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
