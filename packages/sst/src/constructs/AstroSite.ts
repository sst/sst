import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { RouteType } from "astro";
import type { Bucket } from "aws-cdk-lib/aws-s3";
import { SsrSite } from "./SsrSite.js";

const BUILD_META_EXPORT_NAME = "sst.buildMeta.json";

type AstroBuildMeta = {
  domainName?: string;
  outputMode: "server" | "static" | "hybrid";
  pageResolution: "file" | "directory";
  trailingSlash: "ignore" | "always" | "never";
  serverBuildOutputFile: string;
  clientBuildOutputDir: string;
  clientBuildVersionedSubDir: string;
  routes: Array<{
    route: string;
    type: RouteType;
    pattern: string;
    prerender: boolean;
    redirectPath?: string;
    redirectStatus?: 300 | 301 | 302 | 303 | 304 | 307 | 308;
  }>;
};

/**
 * The `AstroSite` construct is a higher level CDK construct that makes it easy to create a Astro app.
 * @example
 * Deploys a Astro app in the `my-astro-app` directory.
 *
 * ```js
 * new AstroSite(stack, "web", {
 *   path: "my-astro-app/",
 * });
 * ```
 */
export class AstroSite extends SsrSite {
  protected typesPath = "src";

  private static getBuildMeta(filePath: string) {
    if (!existsSync(filePath)) {
      throw new Error(
        `Could not find build meta file at ${filePath}. Update your 'astro-sst' package version and rebuild your Astro site.`
      );
    }

    return JSON.parse(readFileSync(filePath, "utf-8")) as AstroBuildMeta;
  }

  protected plan(_bucket: Bucket) {
    const { path: sitePath, edge } = this.props;
    const buildMeta = AstroSite.getBuildMeta(
      join(sitePath, "dist", BUILD_META_EXPORT_NAME)
    );

    const serverConfig = {
      description: "Server handler for Astro",
      handler: join(sitePath, "dist", "server", "entry.handler"),
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
                scopeOverride: this as AstroSite,
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
                streaming: true,
              },
            }),
        s3: {
          type: "s3" as const,
          copy: [
            {
              from: buildMeta.clientBuildOutputDir,
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
        ...readdirSync(join(sitePath, buildMeta.clientBuildOutputDir)).map(
          (item) =>
            ({
              cacheType: "static",
              pattern: statSync(
                join(sitePath, buildMeta.clientBuildOutputDir, item)
              ).isDirectory()
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
      type: "AstroSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
