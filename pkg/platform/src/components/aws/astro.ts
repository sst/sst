import fs from "fs";
import path from "path";
import type { BuildMetaConfig, BuildMetaFileName } from "astro-sst/build-meta";
import { ComponentResourceOptions, Output, all, output } from "@pulumi/pulumi";
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
import { Component, transform } from "./../component.js";
import { Hint } from "./../hint.js";
import { getStringifiedRouteTree } from "./helpers/astroRouteCompressor.js";
import { Link } from "../link.js";
import { Cache } from "./providers/cache.js";

export interface AstroArgs extends SsrSiteArgs {}

const BUILD_META_FILE_NAME: BuildMetaFileName = "sst.buildMeta.json";

/**
 * The `Astro` component makes it easy to create an Astro app.
 * @example
 * #### Using the minimal config
 * ```js
 * new sst.aws.Astro("Web", {
 *   path: "my-astro-app/",
 * });
 * ```
 */
export class Astro extends Component implements Link.Linkable {
  private cdn: Output<Cdn>;
  private assets: Bucket;
  private server: Output<Function>;

  constructor(
    name: string,
    args: AstroArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super("sst:aws:Astro", name, args, opts);

    args = {
      typesPath: "src",
      ...args,
    };

    const parent = this;
    const { sitePath } = prepare(args, opts);
    const { access, bucket } = createBucket(parent, name);
    const outputPath = buildApp(name, args, sitePath);
    const { buildMeta } = loadBuildOutput();
    const plan = buildPlan();
    const { distribution, ssrFunctions, edgeFunctions } =
      createServersAndDistribution(
        parent,
        name,
        args,
        outputPath,
        access,
        bucket,
        plan,
      );
    const serverFunction = ssrFunctions[0] ?? Object.values(edgeFunctions)[0];

    this.assets = bucket;
    this.cdn = distribution;
    this.server = serverFunction;
    Hint.register(
      this.urn,
      all([this.cdn.domainUrl, this.cdn.url]).apply(
        ([domainUrl, url]) => domainUrl ?? url,
      ),
    );
    this.registerOutputs({
      _metadata: {
        mode: $dev ? "placeholder" : "deployed",
        path: sitePath,
        customDomainUrl: this.cdn.domainUrl,
        edge: plan.edge,
      },
    });

    function loadBuildOutput() {
      const cache = new Cache(
        `${name}BuildOutput`,
        {
          data: $dev ? loadBuildMetadataPlaceholder() : loadBuildMetadata(),
        },
        {
          parent,
          ignoreChanges: $dev ? ["*"] : undefined,
        },
      );

      return {
        buildMeta: cache.data as ReturnType<typeof loadBuildMetadata>,
      };
    }

    function loadBuildMetadata() {
      return outputPath.apply((outputPath) => {
        const filePath = path.join(outputPath, "dist", BUILD_META_FILE_NAME);
        if (!fs.existsSync(filePath)) {
          throw new Error(
            `Could not find build meta file at ${filePath}. Update your 'astro-sst' package version and rebuild your Astro site.`,
          );
        }
        return JSON.parse(
          fs.readFileSync(filePath, "utf-8"),
        ) as BuildMetaConfig;
      });
    }

    function loadBuildMetadataPlaceholder() {
      return {
        deploymentStrategy: "regional",
        responseMode: "buffer",
        outputMode: "server",
        pageResolution: "directory",
        trailingSlash: "ignore",
        serverBuildOutputFile: "dist/server/entry.mjs",
        clientBuildOutputDir: "dist/client",
        clientBuildVersionedSubDir: "_astro",
        routes: [
          {
            route: "/_image",
            type: "endpoint",
            pattern: "/^\\/_image$/",
            prerender: false,
          },
          {
            route: "/",
            type: "page",
            pattern: "/^\\/$/",
            prerender: false,
          },
        ],
        serverRoutes: [],
      };
    }

    function buildPlan() {
      return all([outputPath, buildMeta]).apply(([outputPath, buildMeta]) => {
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
              s3: {
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
                path.join(outputPath, buildMeta.clientBuildOutputDir),
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
                          item,
                        ),
                      )
                      .isDirectory()
                      ? `${item}/*`
                      : item,
                    origin: "staticsServer",
                  }) as const,
              ),
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
              server: {
                function: serverConfig,
                streaming: buildMeta.responseMode === "stream",
              },
            };

            plan.origins.fallthroughServer = {
              group: {
                primaryOriginName: "staticsServer",
                fallbackOriginName: "regionalServer",
                fallbackStatusCodes: [403, 404],
              },
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
                  }) as const,
              ),
            );
          }

          buildMeta.routes
            .filter(
              ({ type, route }) =>
                type === "page" && /^\/\d{3}\/?$/.test(route),
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
    return this.cdn.url;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get domainUrl() {
    return this.cdn.domainUrl;
  }

  /**
   * The internally created CDK resources.
   */
  public get nodes() {
    return {
      server: this.server as unknown as Function,
      assets: this.assets,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      type: `{ url: string; }`,
      value: {
        url: this.url,
      },
    };
  }
}
