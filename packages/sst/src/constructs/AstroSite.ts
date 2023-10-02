import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { RouteType } from "astro";
import type { Bucket } from "aws-cdk-lib/aws-s3";
import { SsrSite } from "./SsrSite.js";
import { AllowedMethods } from "aws-cdk-lib/aws-cloudfront";

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

  private static getCFRoutingFunction({
    routes,
    pageResolution,
  }: AstroBuildMeta) {
    const serializedRoutes =
      "[\n" +
      routes
        .map((route) => {
          return `    {route: "${route.route}", pattern: ${
            route.pattern
          }, type: "${route.type}", prerender: ${route.prerender}, ${
            route.redirectPath ? `redirectPath: "${route.redirectPath}", ` : ""
          }${
            route.redirectStatus
              ? `redirectStatus: ${route.redirectStatus}`
              : ""
          } }`;
        })
        .join(",\n") +
      "\n  ]";

    return `// AstroSite CF Routing Function
  var astroRoutes = ${serializedRoutes};
  var matchedRoute = astroRoutes.find(route => route.pattern.test(request.uri));
  if (matchedRoute) {
    if (matchedRoute.type === "page" && matchedRoute.prerender) {
      ${
        pageResolution === "file"
          ? `request.uri = request.uri === "/" ? "/index.html" : request.uri.replace(/\\/?$/, ".html");`
          : `request.uri = request.uri.replace(/\\/?$/, "/index.html");`
      }
    } else if (matchedRoute.type === "redirect") {
      var redirectPath = matchedRoute.redirectPath;
      var slug = matchedRoute.pattern.exec(request.uri)[1];
      if (slug) {
        var redirectToRoute = astroRoutes.find(route => route.route === redirectPath);
        redirectPath = redirectToRoute.route.replace(redirectToRoute.pattern.exec(redirectToRoute.route)[1], slug);
      }
      var statusCode = matchedRoute.redirectStatus || 302;
      var statusDescription = 
        statusCode === 302
        ? "Found"
        : statusCode === 301
        ? "Moved Permanently"
        : "Redirect";
      return {
        statusCode,
        statusDescription,
        headers: { location: { value: redirectPath } }
      }
    }
  }
  // End AstroSite CF Routing Function`;
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
          injections: [
            this.useCloudFrontFunctionHostHeaderInjection(),
            ...(!edge ? [AstroSite.getCFRoutingFunction(buildMeta)] : []),
          ],
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
        ...(edge
          ? {}
          : {
              regionalServer: {
                type: "function",
                constructId: "ServerFunction",
                function: serverConfig,
                streaming: true,
              },
              fallthroughServer: {
                type: "group",
                primaryOriginName: "s3",
                fallbackOriginName: "regionalServer",
                fallbackStatusCodes: [403, 404],
              },
            }),
      },
      behaviors: edge
        ? [
            {
              cacheType: "server",
              cfFunction: "serverCfFunction",
              edgeFunction: "edgeServer",
              origin: "s3",
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
          ]
        : [
            {
              cacheType: "server",
              cfFunction: "serverCfFunction",
              origin: "fallthroughServer",
              allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            },
            {
              cacheType: "static",
              pattern: `${buildMeta.clientBuildVersionedSubDir}/*`,
              origin: "s3",
            },
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
