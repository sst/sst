import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { BuildMetaConfig, BUILD_META_FILE_NAME } from "astro-sst/build-meta";
import {
  Plan,
  SsrSite,
  SsrSiteNormalizedProps,
  SsrSiteProps,
} from "./SsrSite.js";
import { AllowedMethods } from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";

export interface AstroSiteProps extends SsrSiteProps {
  regional?: SsrSiteProps["regional"] & {
    /**
     * List all routes that will be handling non-GET requests. For example, routes like form submissions, logins, and API endpoints.
     *
     * Route patterns are case sensitive. And the following wildcard characters can be used:
     *   - "*" matches 0 or more characters.
     *   - "?" matches exactly 1 character.
     *
     * Matched routes will be handled directly by the server function.
     * @default true
     * @example
     * ```js
     * regional: {
     *   serverRoutes: [
     *     "feedback", // Feedback page which requires POST method
     *     "login",    // Login page which requires POST method
     *     "user/*",   // Directory of user routes which are all SSR
     *     "api/*"     // Directory of API endpoints which require all methods
     *   ]
     * }
     * ```
     */
    serverRoutes?: string[];
    /**
     * Supports [streaming](https://docs.astro.build/en/guides/server-side-rendering/#using-streaming-to-improve-page-performance) responses.
     * @default true
     * @example
     * ```js
     * regional: {
     *   streaming: false,
     * }
     * ```
     */
    streaming?: boolean;
  };
}

type AstroSiteNormalizedProps = AstroSiteProps & SsrSiteNormalizedProps;

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
  declare props: AstroSiteNormalizedProps;

  constructor(scope: Construct, id: string, props: AstroSiteProps) {
    props.typesPath = props.typesPath ?? "src";
    props.fileOptions = props.fileOptions ?? [
      {
        exclude: "*",
        include: "*.css",
        cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
        contentType: "text/css; charset=UTF-8",
      },
      {
        exclude: "*",
        include: "*.js",
        cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
        contentType: "application/javascript; charset=UTF-8",
      },
      {
        exclude: "*",
        include: "*.html",
        cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
        contentType: "text/html; charset=UTF-8",
      },
    ];
    props.regional = props.regional ?? {};
    props.regional.streaming = props.regional.streaming ?? true;

    super(scope, id, props);
  }

  private static getBuildMeta(filePath: string) {
    if (!existsSync(filePath)) {
      throw new Error(
        `Could not find build meta file at ${filePath}. Update your 'astro-sst' package version and rebuild your Astro site.`
      );
    }

    return JSON.parse(readFileSync(filePath, "utf-8")) as BuildMetaConfig;
  }

  private static getCFRoutingFunction({
    routes,
    pageResolution,
  }: BuildMetaConfig) {
    const serializedRoutes =
      "[\n" +
      routes
        .map((route) => {
          return `    {route: "${route.route}", pattern: ${
            route.pattern
          }, type: "${route.type}", ${
            typeof route.prerender !== "undefined"
              ? `prerender: ${route.prerender}, `
              : ``
          }${
            route.redirectPath ? `redirectPath: "${route.redirectPath}", ` : ""
          }${
            route.redirectStatus
              ? `redirectStatus: ${route.redirectStatus}`
              : ""
          } }`;
        })
        .join(",\n") +
      "\n  ]";

    return `  // AstroSite CF Routing Function
  var astroRoutes = ${serializedRoutes};
  var matchedRoute = astroRoutes.find((route) => route.pattern.test(request.uri));
  if (matchedRoute) {
    if (matchedRoute.type === "redirect") {
      var redirectPath = matchedRoute.redirectPath;
      matchedRoute.pattern.exec(request.uri).forEach((match, index) => {
        redirectPath = redirectPath.replace(\`\\\${\${index}}\`, match);
      });
      var statusCode = matchedRoute.redirectStatus || 308;
      return {
        statusCode,
        headers: { location: { value: redirectPath } },
      };
    } else if (matchedRoute.type === "page" && matchedRoute.prerender) {
      ${
        pageResolution === "file"
          ? `request.uri = request.uri === "/" ? "/index.html" : request.uri.replace(/\\/?$/, ".html");`
          : `request.uri = request.uri.replace(/\\/?$/, "/index.html");`
      }
    }
  }
  // End AstroSite CF Routing Function`;
  }

  protected plan() {
    const {
      path: sitePath,
      edge,
      regional: { streaming, serverRoutes },
    } = this.props;

    const buildMeta = AstroSite.getBuildMeta(
      join(sitePath, "dist", BUILD_META_FILE_NAME)
    );

    const serverConfig = {
      description: "Server handler for Astro",
      handler: join(sitePath, "dist", "server", "entry.handler"),
    };

    const plan: Plan = {
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [
            this.useCloudFrontFunctionHostHeaderInjection(),
            ...(!edge ? [AstroSite.getCFRoutingFunction(buildMeta)] : []),
          ],
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
      plan.origins.regionalServer = {
        type: "function",
        constructId: "ServerFunction",
        function: serverConfig,
        streaming,
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
        ...(serverRoutes ?? []).map(
          (route) =>
            ({
              cacheType: "server",
              pattern: route,
              origin: "regionalServer",
            } as const)
        )
      );

      const notFoundRoute = buildMeta.routes.find(
        ({ route, type }) => route.match(/^\/404\/?$/) && type === "page"
      );

      if (notFoundRoute) {
        plan.errorResponses?.push({
          httpStatus: 404,
          responsePagePath: "/404.html",
          responseHttpStatus: 404,
        });
      }
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
