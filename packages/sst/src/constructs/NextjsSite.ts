import fs from "fs";
import url from "url";
import path from "path";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import { Fn, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

import { useProject } from "../project.js";
import { EdgeFunction } from "./EdgeFunction.js";
import { SsrSite, SsrSiteProps } from "./SsrSite.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export interface NextjsSiteProps extends Omit<SsrSiteProps, "edge"> {}

/**
 * The `NextjsSite` construct is a higher level CDK construct that makes it easy to create a Next.js app.
 * @example
 * Deploys a Next.js app in the `my-next-app` directory.
 *
 * ```js
 * new NextjsSite(stack, "web", {
 *   path: "my-next-app/",
 * });
 * ```
 */
export class NextjsSite extends SsrSite {
  constructor(scope: Construct, id: string, props?: NextjsSiteProps) {
    super(scope, id, {
      buildCommand: "npm_config_yes=true npx open-next@latest build",
      ...props,
    });
  }

  protected initBuildConfig() {
    return {
      serverBuildOutputFile: ".open-next/server-function/index.mjs",
      clientBuildOutputDir: ".open-next/assets",
      clientBuildVersionedSubDir: "_next",
    };
  }

  protected createFunctionForRegional(): lambda.Function {
    const { defaults, environment } = this.props;

    // Note: cannot point the bundlePath to the `.open-next/server-function`
    //       b/c the folder contains node_modules. And pnpm node_modules
    //       contains symlinks. CDK cannot zip symlinks correctly.
    //       https://github.com/aws/aws-cdk/issues/9251
    //       We will zip the folder ourselves.
    const zipOutDir = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `Site-${this.node.id}-${this.node.addr}`
      )
    );
    const script = path.resolve(
      __dirname,
      "../support/ssr-site-function-archiver.mjs"
    );
    const result = spawn.sync(
      "node",
      [
        script,
        path.join(this.props.path, ".open-next", "server-function"),
        path.join(zipOutDir, "server-function.zip"),
      ],
      {
        stdio: "inherit",
      }
    );

    if (result.status !== 0) {
      throw new Error(`There was a problem generating the assets package.`);
    }

    return new lambda.Function(this, `ServerFunction`, {
      description: "Server handler for Next.js",
      handler: "index.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(path.join(zipOutDir, "server-function.zip")),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: defaults?.function?.memorySize || 512,
      timeout: Duration.seconds(defaults?.function?.timeout || 10),
      environment,
    });
  }

  private createImageOptimizationFunctionForRegional(): lambda.Function {
    const { defaults, path: sitePath } = this.props;

    return new lambda.Function(this, `ImageFunction`, {
      description: "Image optimization handler for Next.js",
      handler: "index.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(
        path.join(sitePath, ".open-next/image-optimization-function")
      ),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: defaults?.function?.memorySize || 512,
      timeout: Duration.seconds(defaults?.function?.timeout || 10),
      environment: {
        BUCKET_NAME: this.cdk.bucket.bucketName,
      },
    });
  }

  private createMiddlewareEdgeFunctionForRegional() {
    const { defaults, environment, path: sitePath } = this.props;
    const middlewarePath = path.resolve(
      sitePath,
      ".open-next/middleware-function"
    );
    const isMiddlewareEnabled = fs.existsSync(middlewarePath);

    let bundlePath, handler;
    if (isMiddlewareEnabled) {
      bundlePath = middlewarePath;
      handler = "index.handler";
    } else {
      bundlePath = path.resolve(__dirname, "../support/ssr-site-function-stub");
      handler = "server.handler";
    }

    const fn = new EdgeFunction(this, "Middleware", {
      bundlePath,
      handler,
      timeout: 5,
      memory: 128,
      permissions: defaults?.function?.permissions,
      environment,
      format: "esm",
    });

    return { fn, isMiddlewareEnabled };
  }

  protected createCloudFrontDistributionForRegional(): cloudfront.Distribution {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const s3Origin = new origins.S3Origin(this.cdk.bucket);

    // Create server behavior
    const { fn: middlewareFn, isMiddlewareEnabled } =
      this.createMiddlewareEdgeFunctionForRegional();
    const fnUrl = this.serverLambdaForRegional!.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const serverBehavior = {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new origins.HttpOrigin(Fn.parseDomainName(fnUrl.url)),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy:
        cdk?.cachePolicies?.serverRequests ??
        this.createCloudFrontServerCachePolicy(),
      edgeLambdas: isMiddlewareEnabled
        ? [
            {
              eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
              functionVersion: middlewareFn.currentVersion,
            },
          ]
        : undefined,
    };

    // Create image optimization behavior
    const imageFn = this.createImageOptimizationFunctionForRegional();
    const imageFnUrl = imageFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const imageBehavior = {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new origins.HttpOrigin(Fn.parseDomainName(imageFnUrl.url)),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: serverBehavior.cachePolicy,
    };

    // Create statics behavior
    const staticFileBehaviour: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    };

    // Create default behavior
    // default handler for requests that don't match any other path:
    //   - try lambda handler first first
    //   - if failed, fall back to S3
    const fallbackOriginGroup = new origins.OriginGroup({
      primaryOrigin: serverBehavior.origin,
      fallbackOrigin: s3Origin,
      fallbackStatusCodes: [404],
    });
    const defaultBehavior = {
      origin: fallbackOriginGroup,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      compress: true,
      cachePolicy: serverBehavior.cachePolicy,
      edgeLambdas: serverBehavior.edgeLambdas,
    };

    /**
     * Next.js requests
     *
     * - Public asset
     *  Use case: When you request an asset in /public
     *  Request: /myImage.png
     *  Response cache:
     *  - Cache-Control: public, max-age=0, must-revalidate
     *  - x-vercel-cache: MISS (1st request)
     *  - x-vercel-cache: HIT (2nd request)
     *
     * - SSG page
     *  Use case: When you request an SSG page directly
     *  Request: /myPage
     *  Response cache:
     *  - Cache-Control: public, max-age=0, must-revalidate
     *  - Content-Encoding: br
     *  - x-vercel-cache: HIT (2nd request, not set for 1st request)
     *
     * - SSR page (directly)
     *  Use case: When you request an SSR page directly
     *  Request: /myPage
     *  Response cache:
     *  - Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
     *  - x-vercel-cache: MISS
     *
     * - SSR pages (user transition)
     *  Use case: When the page uses getServerSideProps(), and you request this page on
     *            client-side page trasitions. Next.js sends an API request to the server,
     *            which runs getServerSideProps()
     *  Request: /_next/data/_-fpIB1rqWyRD-EJO59pO/myPage.json
     *  Response cache:
     *  - Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
     *  - x-vercel-cache: MISS
     *
     * - Image optimization
     *  Use case: when you request an image
     *  Request: /_next/image?url=%2F_next%2Fstatic%2Fmedia%2F4600x4600.ce39e3d6.jpg&w=256&q=75
     *  Response cache:
     *    - Cache-Control: public, max-age=31536000, immutable
     *    - x-vercel-cache: HIT
     *
     * - API
     *  Use case: when you request an API endpoint
     *  Request: /api/hello
     *  Response cache:
     *    - Cache-Control: public, max-age=0, must-revalidate
     *    - x-vercel-cache: MISS
     */

    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk.certificate,
      defaultBehavior: defaultBehavior,
      additionalBehaviors: {
        "api/*": serverBehavior,
        "_next/data/*": serverBehavior,
        "_next/image*": imageBehavior,
        "_next/*": staticFileBehaviour,
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  protected createCloudFrontServerCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(this, "ServerCache", {
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        // required by image optimization request
        "accept",
        // required by server request
        "x-op-middleware-request-headers",
        "x-op-middleware-response-headers",
        "x-nextjs-data",
        "x-middleware-prefetch"
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      defaultTtl: Duration.days(0),
      maxTtl: Duration.days(365),
      minTtl: Duration.days(0),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      comment: "SST server response cache policy",
    });
  }

  protected generateBuildId(): string {
    const filePath = path.join(this.props.path, ".next/BUILD_ID");
    return fs.readFileSync(filePath).toString();
  }
}
