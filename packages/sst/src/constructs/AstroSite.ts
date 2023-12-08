import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { BuildMetaConfig, BuildMetaFileName } from "astro-sst/build-meta";
import {
  Plan,
  SsrSite,
  SsrSiteNormalizedProps,
  SsrSiteProps,
} from "./SsrSite.js";
import { AllowedMethods } from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";
import { getStringifiedRouteTree } from "./util/astroRouteCompressor.js";

const BUILD_META_FILE_NAME: BuildMetaFileName = "sst.buildMeta.json";

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
  declare props: SsrSiteNormalizedProps;

  constructor(scope: Construct, id: string, props?: SsrSiteProps) {
    super(scope, id, {
      ...props,
      typesPath: props?.typesPath ?? "src",
    });
  }

  private static getBuildMeta(filePath: string) {
    if (!existsSync(filePath)) {
      throw new Error(
        `Could not find build meta file at ${filePath}. Update your 'astro-sst' package version and rebuild your Astro site.`
      );
    }

    return JSON.parse(readFileSync(filePath, "utf-8")) as BuildMetaConfig;
  }
  
  private static getCFRoutingFunction({ routes, pageResolution }: BuildMetaConfig) {
    const stringifiedFlatTree = getStringifiedRouteTree(routes);
  
    return `  var routeData = ${stringifiedFlatTree};
  var findMatch = (path, routeData) => {
    var match = routeData.find((route) => route[0].test(path));
    return match && Array.isArray(match[1]) ? findMatch(path, match[1]) : match;
  };
    
  var matchedRoute = findMatch(request.uri, routeData);
  if (matchedRoute) {
    if (!matchedRoute[1]) {
      ${
        pageResolution === "file"
          ? `request.uri = request.uri === "/" ? "/index.html" : request.uri.replace(/\\/?$/, ".html");`
          : `request.uri = request.uri.replace(/\\/?$/, "/index.html");`
      }
    } else if (matchedRoute[1] === 2) {
      var redirectPath = matchedRoute[2];
      matchedRoute[0].exec(request.uri).forEach((match, index) => {
        redirectPath = redirectPath.replace(\`\\\${\${index}}\`, match);
      });
      return {
        statusCode: matchedRoute[3] || 308,
        headers: { location: { value: redirectPath } },
      };
    }
  }`;
  }

  protected plan() {
    const { path: sitePath } = this.props;

    const buildMeta = AstroSite.getBuildMeta(
      join(sitePath, "dist", BUILD_META_FILE_NAME)
    );

    const isStatic = buildMeta.outputMode === "static";
    const edge = buildMeta.deploymentStrategy === "edge";

    const serverConfig = {
      description: "Server handler for Astro",
      handler: join(sitePath, "dist", "server", "entry.handler"),
    };

    const plan: Plan = {
      edge,
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [
            this.useCloudFrontFunctionHostHeaderInjection(),
            AstroSite.getCFRoutingFunction(buildMeta),
          ],
        },
        serverCfFunctionHostOnly: {
          constructId: "CloudFrontFunctionHostOnly",
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        },
      },
      origins: {
        staticsServer: {
          type: "s3" as const,
          copy: [
            {
              from: buildMeta.clientBuildOutputDir,
              to: "",
              cached: true,
              versionedSubDir: buildMeta.clientBuildVersionedSubDir,
            },
          ],
        },
      },
      behaviors: [],
      errorResponses: [],
    };

    if (edge) {
      plan.edgeFunctions = {
        edgeServer: {
          constructId: "Server",
          function: {
            scopeOverride: this as AstroSite,
            ...serverConfig,
          },
        },
      };
      plan.behaviors.push(
        {
          cacheType: "server",
          cfFunction: "serverCfFunction",
          edgeFunction: "edgeServer",
          origin: "staticsServer",
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
              origin: "staticsServer",
            } as const)
        )
      );
    } else {
      if (isStatic) {
        plan.behaviors.push({
          cacheType: "static",
          cfFunction: "serverCfFunction",
          origin: "staticsServer",
        });
      } else {
        plan.cloudFrontFunctions!.imageServiceCfFunction = {
          constructId: "ImageServiceCloudFrontFunction",
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        };

        plan.origins.regionalServer = {
          type: "function",
          constructId: "ServerFunction",
          function: serverConfig,
          streaming: buildMeta.responseMode === "stream",
        };

        plan.origins.fallthroughServer = {
          type: "group",
          primaryOriginName: "staticsServer",
          fallbackOriginName: "regionalServer",
          fallbackStatusCodes: [403, 404],
        };

        plan.behaviors.push(
          {
            cacheType: "server",
            cfFunction: "serverCfFunction",
            origin: "fallthroughServer",
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          },
          {
            cacheType: "static",
            pattern: `${buildMeta.clientBuildVersionedSubDir}/*`,
            origin: "staticsServer",
          },
          {
            cacheType: "server",
            pattern: "_image",
            cfFunction: "imageServiceCfFunction",
            origin: "regionalServer",
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          },
          ...buildMeta.serverRoutes?.map(
            (route) =>
              ({
                cacheType: "server",
                cfFunction: "serverCfFunctionHostOnly",
                pattern: route,
                origin: "regionalServer",
              } as const)
          )
        );
      }

      buildMeta.routes
        .filter(
          ({ type, route }) => type === "page" && /^\/\d{3}\/?$/.test(route)
        )
        .forEach(({ route, prerender }) => {
          switch (route) {
            case "/404":
            case "/404/":
              plan.errorResponses?.push({
                httpStatus: 404,
                responsePagePath: prerender ? "/404.html" : "/404",
                responseHttpStatus: 404,
              });
              if (isStatic) {
                plan.errorResponses?.push({
                  httpStatus: 403,
                  responsePagePath: "/404.html",
                  responseHttpStatus: 404,
                });
              }
              break;
            case "/500":
            case "/500/":
              plan.errorResponses?.push({
                httpStatus: 500,
                responsePagePath: prerender ? "/500.html" : "/500",
                responseHttpStatus: 500,
              });
              break;
          }
        });
    }

    return this.validatePlan(plan);
  }

  public getConstructMetadata() {
    return {
      type: "AstroSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
