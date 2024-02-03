import fs from "fs";
import path from "path";
import { ComponentResourceOptions, Output, all, output } from "@pulumi/pulumi";
import { Function } from "./function.js";
import {
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
import { Link } from "./link.js";

export interface RemixArgs extends SsrSiteArgs {
  /**
   * The server function is deployed to Lambda in a single region. Alternatively, you can enable this option to deploy to Lambda@Edge.
   * @default false
   */
  edge?: boolean;
}

/**
 * The `Remix` component makes it easy to create an Remix app.
 * @example
 * ```js
 * new Remix("Web", {
 *   path: "my-remix-app/",
 * });
 * ```
 */
export class Remix extends Component implements Link.Linkable {
  private doNotDeploy: Output<boolean>;
  private edge: Output<boolean>;
  private cdn: Cdn;
  private assets: Bucket;
  private server?: Function;
  //private serverFunctionForDev?: Function;

  constructor(
    name: string,
    args: RemixArgs = {},
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Remix", name, args, opts);

    const parent = this;
    const edge = normalizeEdge();
    const { sitePath, doNotDeploy } = prepare(args, opts);
    //if (doNotDeploy) {
    //  // @ts-expect-error
    //  this.bucket = this.distribution = null;
    //  this.serverFunctionForDev = createServerFunctionForDev();
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
    this.registerOutputs({
      _metadata: {
        mode: $dev ? "placeholder" : "deployed",
        path: sitePath,
        customDomainUrl: this.cdn.domainUrl,
        edge: this.edge,
      },
    });

    function normalizeEdge() {
      return output(args?.edge).apply((edge) => edge ?? false);
    }

    function buildPlan() {
      return all([outputPath, edge]).apply(([outputPath, edge]) => {
        const serverConfig = createServerLambdaBundle(
          outputPath,
          edge ? "edge-server.mjs" : "regional-server.mjs"
        );

        return validatePlan(
          transform(args?.transform?.plan, {
            edge,
            cloudFrontFunctions: {
              serverCfFunction: {
                injections: [useCloudFrontFunctionHostHeaderInjection()],
              },
              staticCfFunction: {
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
                    function: serverConfig,
                  },
                }
              : undefined,
            origins: {
              ...(edge
                ? {}
                : {
                    regionalServer: {
                      type: "function",
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
              ...fs.readdirSync(path.join(outputPath, "public")).map(
                (item) =>
                  ({
                    cacheType: "static",
                    pattern: fs
                      .statSync(path.join(outputPath, "public", item))
                      .isDirectory()
                      ? `${item}/*`
                      : item,
                    cfFunction: "staticCfFunction",
                    origin: "s3",
                  }) as const
              ),
            ],
          })
        );
      });
    }

    function createServerLambdaBundle(outputPath: string, wrapperFile: string) {
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
      const buildPath = path.join(outputPath, "build");
      fs.mkdirSync(buildPath, { recursive: true });

      // Copy the server lambda handler
      fs.copyFileSync(
        path.join($cli.paths.platform, "dist", "remix-server", wrapperFile),
        path.join(buildPath, "server.mjs")
      );

      // Copy the Remix polyfil to the server build directory
      //
      // Note: We need to ensure that the polyfills are injected above other code that
      // will depend on them. Importing them within the top of the lambda code
      // doesn't appear to guarantee this, we therefore leverage ESBUild's
      // `inject` option to ensure that the polyfills are injected at the top of
      // the bundle.
      const polyfillDest = path.join(buildPath, "polyfill.mjs");
      fs.copyFileSync(
        path.join($cli.paths.platform, "dist", "remix-server", "polyfill.mjs"),
        polyfillDest
      );

      return {
        handler: path.join(buildPath, "server.handler"),
        nodejs: {
          esbuild: {
            inject: [polyfillDest],
          },
        },
      };
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
