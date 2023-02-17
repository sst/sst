import fs from "fs";
import url from "url";
import path from "path";
import { Construct } from "constructs";
import { Fn, Duration as CdkDuration, RemovalPolicy } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";
import { SsrSite, SsrSiteProps } from "./SsrSite.js";
import { Size, toCdkSize } from "./util/size.js";
import { Duration } from "./util/duration.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export interface NextjsSiteProps extends Omit<SsrSiteProps, "edge"> {
  imageOptimization?: {
    /**
     * The amount of memory in MB allocated for image optimization function.
     * @default 1024 MB
     * @example
     * ```js
     * memorySize: "512 MB",
     * ```
     */
    memorySize?: number | Size;
  };
}

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
  protected declare props: Omit<NextjsSiteProps, "path"> & {
    path: string;
    timeout: number | Duration;
    memorySize: number | Size;
  };

  constructor(scope: Construct, id: string, props?: NextjsSiteProps) {
    super(scope, id, {
      buildCommand: "npx --yes open-next@latest build",
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
    const { runtime, timeout, memorySize, permissions, environment, cdk } =
      this.props;
    const ssrFn = new SsrFunction(this, `ServerFunction`, {
      description: "Server handler for Next.js",
      bundlePath: path.join(this.props.path, ".open-next", "server-function"),
      handler: "index.handler",
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
      ...cdk?.server,
    });
    return ssrFn.function;
  }

  private createImageOptimizationFunctionForRegional(): lambda.Function {
    const { imageOptimization, path: sitePath } = this.props;

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
      memorySize: imageOptimization?.memorySize
        ? typeof imageOptimization.memorySize === "string"
          ? toCdkSize(imageOptimization.memorySize).toMebibytes()
          : imageOptimization.memorySize
        : 1536,
      timeout: CdkDuration.seconds(25),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        BUCKET_NAME: this.cdk.bucket.bucketName,
      },
    });
  }

  private createMiddlewareEdgeFunctionForRegional() {
    const { permissions, environment, path: sitePath } = this.props;
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
      memorySize: 128,
      permissions,
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
        cdk?.serverCachePolicy ?? this.createCloudFrontServerCachePolicy(),
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
        "x-middleware-prefetch",
        // required by server request (in-place routing)
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree"
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      defaultTtl: CdkDuration.days(0),
      maxTtl: CdkDuration.days(365),
      minTtl: CdkDuration.days(0),
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
