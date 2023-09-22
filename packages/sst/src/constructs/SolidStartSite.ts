import fs from "fs";
import path from "path";
import { SsrSite } from "./SsrSite.js";

/**
 * The `SolidStartSite` construct is a higher level CDK construct that makes it easy to create a SolidStart app.
 * @example
 * Deploys a SolidStart app in the `my-solid-start-app` directory.
 *
 * ```js
 * new SolidStartSite(stack, "web", {
 *   path: "my-solid-start-app/",
 * });
 * ```
 */
export class SolidStartSite extends SsrSite {
  protected plan() {
    const { path: sitePath, edge } = this.props;
    const serverConfig = {
      description: "Server handler for Solid",
      handler: path.join(sitePath, "dist", "server", "index.handler"),
    };

    return this.validatePlan({
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        },
      },
      edgeFunctions: edge
        ? {
            edgeServer: {
              constructId: "Server",
              function: {
                scopeOverride: this as SolidStartSite,
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
                type: "function" as const,
                constructId: "ServerFunction",
                function: serverConfig,
              },
            }),
        s3: {
          type: "s3" as const,
          copy: [
            {
              from: "dist/client",
              to: "",
              cached: true,
              versionedSubDir: "assets",
            },
          ],
        },
      },
      behaviors: [
        edge
          ? {
              cacheType: "server" as const,
              cfFunction: "serverCfFunction",
              edgeFunction: "edgeServer",
              origin: "s3",
            }
          : {
              cacheType: "server" as const,
              cfFunction: "serverCfFunction",
              origin: "regionalServer",
            },
        // create 1 behaviour for each top level asset file/folder
        ...fs.readdirSync(path.join(sitePath, "dist/client")).map(
          (item) =>
            ({
              cacheType: "static",
              pattern: fs
                .statSync(path.join(sitePath, "dist/client", item))
                .isDirectory()
                ? `${item}/*`
                : item,
              origin: "s3",
            } as const)
        ),
      ],
    });
  }

  public getConstructMetadata() {
    return {
      type: "SolidStartSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
