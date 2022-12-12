import fs from "fs";
import url from "url";
import path from "path";
import esbuild from "esbuild";
import { Construct } from "constructs";
import {
  Fn,
  Duration,
  RemovalPolicy,
} from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

import { SsrSite, SsrSiteProps } from "./SsrSite.js";
import { EdgeFunction } from "./EdgeFunction.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export interface Nextjs13SiteProps extends Omit<SsrSiteProps, "edge"> { }

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
export class Nextjs13Site extends SsrSite {
  private assetsDir?: string;

  constructor(scope: Construct, id: string, props: Nextjs13SiteProps) {
    super(scope, id, props);
  }

  protected initBuildConfig() {
    return {
      buildCommand: "npm_config_yes=true npx open-next@snapshot build",
      serverBuildOutputFile: ".open-next/server-function/index.cjs",
      clientBuildOutputDir: ".open-next/assets",
      clientBuildVersionedSubDir: "_next",
      siteStub: path.resolve(__dirname, "../support/nextjs-site-html-stub"),
    };
  }

  protected createFunctionForRegional(): lambda.Function {
    const { defaults, environment } = this.props;

    let bundlePath, handler;
    if (this.isPlaceholder) {
      bundlePath = path.resolve(__dirname, "../support/ssr-site-function-stub");
      handler = "server.handler";
    }
    else {
      bundlePath = path.join(this.props.path, path.dirname(this.buildConfig.serverBuildOutputFile));
      handler = "index.handler";
    }

    // TODO remove
    //this.createServerLambdaBundle("regional-server.js");
    return new lambda.Function(this, `ServerFunction`, {
      description: "Server handler for Remix",
      handler,
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(bundlePath),
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: defaults?.function?.memorySize || 512,
      timeout: Duration.seconds(defaults?.function?.timeout || 10),
      environment,
    });
  }

  protected createCloudFrontDistributionForRegional(): cloudfront.Distribution {
    const { cdk, environment } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const s3Origin = new origins.S3Origin(this.cdk.bucket);

    // Create edge function
    const edgeFn = new EdgeFunction(this, `Middleware`, {
      bundlePath: path.resolve(this.props.path, ".open-next/middleware-function"),
      handler: "index.handler",
      timeout: 5,
      memory: 128,
      //permissions: defaults?.function?.permissions,
      environment,
      format: "esm",
    });

    // Create server behavior
    const fnUrl = this.serverLambdaForRegional!.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const serverBehavior = {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new origins.HttpOrigin(Fn.parseDomainName(fnUrl.url)),
      //originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy:
        cdk?.cachePolicies?.serverCachePolicy ??
        this.createCloudFrontServerCachePolicy(),
      edgeLambdas: [
        {
          eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
          functionVersion: edgeFn.currentVersion,
        }
      ],
    };

    // Create statics behavior
    const staticBehaviour: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy:
        cdk?.cachePolicies?.staticsCachePolicy ??
        this.createCloudFrontStaticsCachePolicy(),
    };

    // Create default behavior
    // default handler for requests that don't match any other path:
    //   - try S3 first
    //   - if 403, fall back to lambda handler (mostly for /)
    //   - if 404, fall back to lambda handler
    const fallbackOriginGroup = new origins.OriginGroup({
      primaryOrigin: serverBehavior.origin,
      fallbackOrigin: s3Origin,
      fallbackStatusCodes: [404],
    });
    const defaultBehavior = {
      origin: fallbackOriginGroup,
      //originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      // cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
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

    /**
     * Next.js build output
     * .next/
     *   server/
     *     chunks/
     *     pages/
     *     middleware.js
     *   standalone/
     *     .next/
     *       server/  (same content as top-level .next/server)
     *       BUILD_ID
     *     node_modules/
     *     posts/
     *     package.json
     *     server.js
     *   static/
     *     chunks/   (JS chunks)
     *     css/      (CSS files)
     *     media/    (Images)
     *   BUILD_ID
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
        "_next/image*": staticBehaviour,
        "_next/*": staticBehaviour,
        "assets/*": staticBehaviour,
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  protected generateBuildId(): string {
    if (this.isPlaceholder) {
      return "live";
    }

    const filePath = path.join(this.props.path, ".next/BUILD_ID");
    return fs.readFileSync(filePath).toString();
  }
}