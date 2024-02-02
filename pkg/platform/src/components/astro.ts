import fs from "fs";
import path from "path";
import type { BuildMetaConfig, BuildMetaFileName } from "astro-sst/build-meta";
import { ComponentResourceOptions, Output, all } from "@pulumi/pulumi";
import { Function } from "./function.js";
import {
  Plan,
  SsrSiteArgs,
  buildApp,
  createBucket,
  createServersAndDistribution,
  prepare,
  useCloudFrontFunctionHostHeaderInjection,
  validatePlan,
} from "./ssr-site.js";
import { Cdn } from "./cdn.js";
import { Bucket } from "./bucket.js";
import { Component, transform } from "./component.js";
import { Hint } from "./hint.js";
import { getStringifiedRouteTree } from "./util/astroRouteCompressor.js";
import { Link } from "./link.js";

export interface AstroArgs extends SsrSiteArgs {}

const BUILD_META_FILE_NAME: BuildMetaFileName = "sst.buildMeta.json";

/**
 * The `Astro` component makes it easy to create an Astro app.
 * @example
 * ```js
 * new Astro("Web", {
 *   path: "my-astro-app/",
 * });
 * ```
 */
export class Astro extends Component implements Link.Linkable {
  private doNotDeploy: Output<boolean>;
  private edge: Output<boolean>;
  private cdn: Cdn;
  private assets: Bucket;
  private server?: Function;
  //private serverFunctionForDev?: Function;

  constructor(
    name: string,
    args: AstroArgs = {},
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Astro", name, args, opts);

    args = {
      typesPath: "src",
      ...args,
    };

    const parent = this;
    const { sitePath, doNotDeploy } = prepare(args);
    //if (doNotDeploy) {
    //  // @ts-expect-error
    //  this.bucket = this.distribution = null;
    //  this.serverFunctionForDev = createServerFunctionForDev();
    //  app.registerTypes(this);
    //  return;
    //}

    const outputPath = buildApp(name, args, sitePath);
    const { access, bucket } = createBucket(parent, name);

    const plan = buildPlan();

    const { distribution, ssrFunctions, edgeFunctions } =
      createServersAndDistribution(
        parent,
        name,
        args,
        outputPath,
        access,
        bucket,
        plan
      );
    const serverFunction = ssrFunctions[0] ?? Object.values(edgeFunctions)[0];

    this.doNotDeploy = doNotDeploy;
    this.assets = bucket;
    this.cdn = distribution as unknown as Cdn;
    this.server = serverFunction as unknown as Function;
    this.edge = plan.edge;
    Hint.register(
      this.urn,
      all([this.cdn.domainUrl, this.cdn.url]).apply(
        ([domainUrl, url]) => domainUrl ?? url
      )
    );

    //app.registerTypes(this);

    function buildPlan() {
      return all([outputPath, getBuildMeta()]).apply(
        ([outputPath, buildMeta]) => {
          const isStatic = buildMeta.outputMode === "static";
          const edge = buildMeta.deploymentStrategy === "edge";
          const serverConfig = {
            handler: path.join(outputPath, "dist", "server", "entry.handler"),
          };
          const plan: Plan = {
            edge,
            cloudFrontFunctions: {
              serverCfFunction: {
                injections: [
                  useCloudFrontFunctionHostHeaderInjection(),
                  useCloudFrontRoutingInjection(buildMeta),
                ],
              },
              serverCfFunctionHostOnly: {
                injections: [useCloudFrontFunctionHostHeaderInjection()],
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
                function: serverConfig,
              },
            };
            plan.behaviors.push(
              {
                cacheType: "server",
                cfFunction: "serverCfFunction",
                edgeFunction: "edgeServer",
                origin: "staticsServer",
              },
              ...fs
                .readdirSync(
                  path.join(outputPath, buildMeta.clientBuildOutputDir)
                )
                .map(
                  (item) =>
                    ({
                      cacheType: "static",
                      pattern: fs
                        .statSync(
                          path.join(
                            outputPath,
                            buildMeta.clientBuildOutputDir,
                            item
                          )
                        )
                        .isDirectory()
                        ? `${item}/*`
                        : item,
                      origin: "staticsServer",
                    }) as const
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
                injections: [useCloudFrontFunctionHostHeaderInjection()],
              };

              plan.origins.regionalServer = {
                type: "function",
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
                  allowedMethods: ["GET", "HEAD", "OPTIONS"],
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
                  allowedMethods: ["GET", "HEAD", "OPTIONS"],
                },
                ...buildMeta.serverRoutes?.map(
                  (route) =>
                    ({
                      cacheType: "server",
                      cfFunction: "serverCfFunctionHostOnly",
                      pattern: route,
                      origin: "regionalServer",
                    }) as const
                )
              );
            }

            buildMeta.routes
              .filter(
                ({ type, route }) =>
                  type === "page" && /^\/\d{3}\/?$/.test(route)
              )
              .forEach(({ route, prerender }) => {
                switch (route) {
                  case "/404":
                  case "/404/":
                    plan.errorResponses?.push({
                      errorCode: 404,
                      responsePagePath: prerender ? "/404.html" : "/404",
                      responseCode: 404,
                    });
                    if (isStatic) {
                      plan.errorResponses?.push({
                        errorCode: 403,
                        responsePagePath: "/404.html",
                        responseCode: 404,
                      });
                    }
                    break;
                  case "/500":
                  case "/500/":
                    plan.errorResponses?.push({
                      errorCode: 500,
                      responsePagePath: prerender ? "/500.html" : "/500",
                      responseCode: 500,
                    });
                    break;
                }
              });
          }

          return validatePlan(transform(args?.transform?.plan, plan));
        }
      );
    }

    function getBuildMeta() {
      return outputPath.apply((outputPath) => {
        const filePath = path.join(outputPath, "dist", BUILD_META_FILE_NAME);

        if (!fs.existsSync(filePath)) {
          throw new Error(
            `Could not find build meta file at ${filePath}. Update your 'astro-sst' package version and rebuild your Astro site.`
          );
        }
        return JSON.parse(
          fs.readFileSync(filePath, "utf-8")
        ) as BuildMetaConfig;
      });
    }

    function useCloudFrontRoutingInjection({
      routes,
      pageResolution,
    }: BuildMetaConfig) {
      return `
    var routeData = ${getStringifiedRouteTree(routes)};
    var findMatch = (path, routeData) => {
      var match = routeData.find((route) => route[0].test(path));
      return match && Array.isArray(match[1]) ? findMatch(path, match[1]) : match;
    };
      
    var matchedRoute = findMatch(request.uri, routeData);
    if (matchedRoute) {
      if (!matchedRoute[1] && !/^.*\\.[^\\/]+$/.test(request.uri)) {
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
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    //if (this.doNotDeploy) return this.props.dev?.url;
    return this.cdn.url;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get domainUrl() {
    if (this.doNotDeploy) return;

    return this.cdn.domainUrl;
  }

  public getSSTLink() {
    return {
      type: `{ url: string; }`,
      value: {
        url: this.url,
      },
    };
  }

  /** @internal */
  private getConstructMetadataBase() {
    //  return {
    //    data: {
    //      mode: this.doNotDeploy
    //        ? ("placeholder" as const)
    //        : ("deployed" as const),
    //      path: this.props.path,
    //      runtime: this.props.runtime,
    //      domainUrl: this.domainUrl,
    //      url: this.url,
    //      edge: this.edge,
    //      server: (this.serverFunctionForDev || this.server)
    //        ?.functionArn!,
    //      secrets: (this.props.bind || [])
    //        .filter((c) => c instanceof Secret)
    //        .map((c) => (c as Secret).name),
    //    },
    //  };
  }

  /** @internal */
  public getConstructMetadata() {
    // TODO implement metadata
    //  const metadata = this.getConstructMetadataBase();
    //  return {
    //    ...metadata,
    //    type: "AstroSite" as const,
    //    data: {
    //      ...metadata.data,
    //      routes: isPerRouteLoggingEnabled()
    //        ? {
    //            logGroupPrefix: `/sst/lambda/${
    //              (this.server as SsrFunction).functionName
    //            }`,
    //            data: this.useRoutes().map(({ route, logGroupPath }) => ({
    //              route,
    //              logGroupPath,
    //            })),
    //          }
    //        : undefined,
    //    },
    //  };
  }
}
