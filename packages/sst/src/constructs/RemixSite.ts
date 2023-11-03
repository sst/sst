import fs from "fs";
import url from "url";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { SsrSite, SsrSiteNormalizedProps, SsrSiteProps } from "./SsrSite.js";
import { VisibleError } from "../error.js";
import { useWarning } from "./util/warning.js";
import { Construct } from "constructs";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

type RemixConfig = {
  assetsBuildDirectory: string;
  publicPath: string;
  serverBuildPath: string;
  serverPlatform: string;
  server?: string;
};

export interface RemixSiteProps extends SsrSiteProps {
  /**
   * The server function is deployed to Lambda in a single region. Alternatively, you can enable this option to deploy to Lambda@Edge.
   * @default false
   */
  edge?: boolean;
}

type RemixSiteNormalizedProps = RemixSiteProps & SsrSiteNormalizedProps;

/**
 * The `RemixSite` construct is a higher level CDK construct that makes it easy to create a Remix app.
 *
 * @example
 *
 * Deploys a Remix app in the `my-remix-app` directory.
 *
 * ```js
 * new RemixSite(stack, "web", {
 *   path: "my-remix-app/",
 * });
 * ```
 */
export class RemixSite extends SsrSite {
  declare props: RemixSiteNormalizedProps;

  protected plan() {
    const { path: sitePath, edge } = this.props;

    const { handler, inject } = this.createServerLambdaBundle(
      edge ? "edge-server.js" : "regional-server.js"
    );
    const format = this.getServerModuleFormat();
    const serverConfig = {
      description: "Server handler for Remix",
      handler,
      format,
      nodejs: {
        esbuild: {
          inject,
        },
      },
    };

    return this.validatePlan({
      edge: edge ?? false,
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        },
        staticCfFunction: {
          constructId: "CloudFrontFunctionForStaticBehavior",
          injections: [
            // Note: When using libraries like remix-flat-routes the file can
            // contains special characters like "+". It needs to be encoded.
            `request.uri = request.uri.split('/').map(encodeURIComponent).join('/');`,
          ],
        },
      },
      edgeFunctions: edge
        ? {
            edgeServer: {
              constructId: "Server",
              function: {
                scopeOverride: this as RemixSite,
                ...serverConfig,
              },
            },
          }
        : undefined,
      origins: {
        ...(edge
          ? {}
          : {
              regionalServer: {
                type: "function",
                constructId: "ServerFunction",
                function: serverConfig,
              },
            }),
        s3: {
          type: "s3",
          copy: [
            {
              from: "public",
              to: "",
              cached: true,
              versionedSubDir: "build",
            },
          ],
        },
      },
      behaviors: [
        edge
          ? {
              cacheType: "server",
              cfFunction: "serverCfFunction",
              edgeFunction: "edgeServer",
              origin: "s3",
            }
          : {
              cacheType: "server",
              cfFunction: "serverCfFunction",
              origin: "regionalServer",
            },
        // create 1 behaviour for each top level asset file/folder
        ...fs.readdirSync(path.join(sitePath, "public")).map(
          (item) =>
            ({
              cacheType: "static",
              pattern: fs
                .statSync(path.join(sitePath, "public", item))
                .isDirectory()
                ? `${item}/*`
                : item,
              cfFunction: "staticCfFunction",
              origin: "s3",
            } as const)
        ),
      ],
    });
  }
  protected getServerModuleFormat(): "cjs" | "esm" {
    const { path: sitePath } = this.props;

    // Validate config path
    const configPath = path.resolve(sitePath, "remix.config.js");
    if (!fs.existsSync(configPath)) {
      throw new VisibleError(
        `In the "${this.node.id}" Site, could not find "remix.config.js" at expected path "${configPath}".`
      );
    }

    // Load config
    // note: we try to handle Remix v1 and v2
    //  - In v1, the config is in CJS by default (ie. module.exports = { ... })
    //    and the config can be `require`d directly. We will determine the server
    //    format based on "serverModuleFormat" in the config.
    //  - In v2, the config is in ESM by default (ie. export default { ... })
    //    and we will assume the server format to be ESM.
    let userConfig: any;
    try {
      userConfig = require(configPath);
    } catch (e) {
      return "esm";
    }
    const format = userConfig.serverModuleFormat ?? "cjs";
    if (userConfig.serverModuleFormat !== "esm") {
      useWarning().add("remix.cjs");
    }

    // Validate config
    const configDefaults: RemixConfig = {
      assetsBuildDirectory: "public/build",
      publicPath: "/build/",
      serverBuildPath: "build/index.js",
      serverPlatform: "node",
    };
    const config: RemixConfig = {
      ...configDefaults,
      ...userConfig,
    };
    Object.keys(configDefaults).forEach((key) => {
      const k = key as keyof RemixConfig;
      if (config[k] !== configDefaults[k]) {
        throw new VisibleError(
          `In the "${this.node.id}" Site, remix.config.js "${key}" must be "${configDefaults[k]}".`
        );
      }
    });

    return format;
  }

  private createServerLambdaBundle(wrapperFile: string) {
    // Create a Lambda@Edge handler for the Remix server bundle.
    //
    // Note: Remix does perform their own internal ESBuild process, but it
    // doesn't bundle 3rd party dependencies by default. In the interest of
    // keeping deployments seamless for users we will create a server bundle
    // with all dependencies included. We will still need to consider how to
    // address any need for external dependencies, although I think we should
    // possibly consider this at a later date.

    // In this path we are assuming that the Remix build only outputs the
    // "core server build". We can safely assume this as we have guarded the
    // remix.config.js to ensure it matches our expectations for the build
    // configuration.
    // We need to ensure that the "core server build" is wrapped with an
    // appropriate Lambda@Edge handler. We will utilise an internal asset
    // template to create this wrapper within the "core server build" output
    // directory.

    // Ensure build directory exists
    const buildPath = path.join(this.props.path, "build");
    fs.mkdirSync(buildPath, { recursive: true });

    // Copy the server lambda handler
    fs.copyFileSync(
      path.resolve(__dirname, `../support/remix-site-function/${wrapperFile}`),
      path.join(buildPath, "server.js")
    );

    // Copy the Remix polyfil to the server build directory
    //
    // Note: We need to ensure that the polyfills are injected above other code that
    // will depend on them. Importing them within the top of the lambda code
    // doesn't appear to guarantee this, we therefore leverage ESBUild's
    // `inject` option to ensure that the polyfills are injected at the top of
    // the bundle.
    const polyfillDest = path.join(buildPath, "polyfill.js");
    fs.copyFileSync(
      path.resolve(__dirname, "../support/remix-site-function/polyfill.js"),
      polyfillDest
    );

    return {
      handler: path.join(buildPath, "server.handler"),
      inject: [polyfillDest],
    };
  }

  public getConstructMetadata() {
    return {
      type: "RemixSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
