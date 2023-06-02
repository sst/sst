import fs from "fs";
import path from "path";
import { Construct } from "constructs";
import {
  Fn,
  Duration as CdkDuration,
  RemovalPolicy,
  CustomResource,
} from "aws-cdk-lib/core";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  Function as CdkFunction,
  Code,
  Runtime,
  Architecture,
  FunctionUrlAuthType,
  IVersion,
} from "aws-cdk-lib/aws-lambda";
import {
  Distribution,
  ViewerProtocolPolicy,
  AllowedMethods,
  LambdaEdgeEventType,
  BehaviorOptions,
  CachedMethods,
  CachePolicy,
  ICachePolicy,
  IOriginRequestPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import {
  S3Origin,
  HttpOrigin,
  OriginGroup,
} from "aws-cdk-lib/aws-cloudfront-origins";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Stack } from "./Stack.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";
import { SsrSite, SsrSiteProps } from "./SsrSite.js";
import { Size, toCdkSize } from "./util/size.js";

export interface NextjsSiteProps extends Omit<SsrSiteProps, "nodejs"> {
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
  /**
   * The number of server functions to keep warm. This option is only supported for the regional mode.
   * @default Server function is not kept warm
   */
  warm?: number;
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
  protected declare props: NextjsSiteProps & {
    path: Exclude<NextjsSiteProps["path"], undefined>;
    runtime: Exclude<NextjsSiteProps["runtime"], undefined>;
    timeout: Exclude<NextjsSiteProps["timeout"], undefined>;
    memorySize: Exclude<NextjsSiteProps["memorySize"], undefined>;
    waitForInvalidation: Exclude<
      NextjsSiteProps["waitForInvalidation"],
      undefined
    >;
  };

  constructor(scope: Construct, id: string, props?: NextjsSiteProps) {
    super(scope, id, {
      buildCommand: "npx --yes open-next@1.4.0 build",
      ...props,
    });

    this.createWarmer();
  }

  protected initBuildConfig() {
    return {
      typesPath: ".",
      serverBuildOutputFile: ".open-next/server-function/index.mjs",
      clientBuildOutputDir: ".open-next/assets",
      clientBuildVersionedSubDir: "_next",
    };
  }

  protected createFunctionForRegional(): CdkFunction {
    const {
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      cdk,
    } = this.props;
    const ssrFn = new SsrFunction(this, `ServerFunction`, {
      description: "Next.js server",
      bundle: path.join(this.props.path, ".open-next", "server-function"),
      handler: "index.handler",
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      ...cdk?.server,
    });
    return ssrFn.function;
  }

  protected createFunctionForEdge(): EdgeFunction {
    const { runtime, timeout, memorySize, bind, permissions, environment } =
      this.props;
    return new EdgeFunction(this, "ServerFunction", {
      bundle: path.join(this.props.path, ".open-next", "server-function"),
      handler: "index.handler",
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
    });
  }

  private createImageOptimizationFunction(): CdkFunction {
    const { imageOptimization, path: sitePath } = this.props;

    return new CdkFunction(this, `ImageFunction`, {
      description: "Next.js image optimizer",
      handler: "index.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: RetentionDays.THREE_DAYS,
      code: Code.fromAsset(
        path.join(sitePath, ".open-next/image-optimization-function")
      ),
      runtime: Runtime.NODEJS_18_X,
      memorySize: imageOptimization?.memorySize
        ? typeof imageOptimization.memorySize === "string"
          ? toCdkSize(imageOptimization.memorySize).toMebibytes()
          : imageOptimization.memorySize
        : 1536,
      timeout: CdkDuration.seconds(25),
      architecture: Architecture.ARM_64,
      environment: {
        BUCKET_NAME: this.cdk!.bucket.bucketName,
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ["s3:GetObject"],
          resources: [this.cdk!.bucket.arnForObjects("*")],
        }),
      ],
    });
  }

  private createWarmer() {
    const { warm, edge } = this.props;
    if (!warm) return;

    if (warm && edge) {
      throw new Error(
        `Warming is currently supported only for the regional mode.`
      );
    }

    if (!this.serverLambdaForRegional) return;

    // Create warmer function
    const warmer = new CdkFunction(this, "WarmerFunction", {
      description: "Next.js warmer",
      code: Code.fromAsset(
        path.join(this.props.path, ".open-next/warmer-function")
      ),
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      timeout: CdkDuration.minutes(15),
      memorySize: 1024,
      environment: {
        FUNCTION_NAME: this.serverLambdaForRegional.functionName,
        CONCURRENCY: warm.toString(),
      },
    });
    this.serverLambdaForRegional.grantInvoke(warmer);

    // Create cron job
    new Rule(this, "WarmerRule", {
      schedule: Schedule.rate(CdkDuration.minutes(5)),
      targets: [new LambdaFunction(warmer, { retryAttempts: 0 })],
    });

    // Create custom resource to prewarm on deploy
    const stack = Stack.of(this) as Stack;
    const policy = new Policy(this, "PrewarmerPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [warmer.functionArn],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);
    const resource = new CustomResource(this, "Prewarmer", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::FunctionInvoker",
      properties: {
        version: Date.now().toString(),
        functionName: warmer.functionName,
      },
    });
    resource.node.addDependency(policy);
  }

  protected createCloudFrontDistributionForRegional(): Distribution {
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

    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const s3Origin = new S3Origin(this.cdk!.bucket);
    const serverFnUrl = this.serverLambdaForRegional!.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });
    const serverOrigin = new HttpOrigin(Fn.parseDomainName(serverFnUrl.url));
    const cachePolicy =
      cdk?.serverCachePolicy ??
      this.buildServerCachePolicy([
        "accept",
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree",
      ]);
    const originRequestPolicy = this.buildServerOriginRequestPolicy();
    const serverBehavior = this.buildServerBehaviorForRegional(
      serverOrigin,
      cachePolicy,
      originRequestPolicy
    );

    return new Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk!.certificate,
      defaultBehavior: this.buildDefaultNextjsBehaviorForRegional(
        serverOrigin,
        s3Origin,
        cachePolicy,
        originRequestPolicy
      ),
      additionalBehaviors: {
        "api/*": serverBehavior,
        "_next/data/*": serverBehavior,
        "_next/image*": this.buildImageBehavior(cachePolicy),
        "_next/*": this.buildStaticFileBehavior(s3Origin),
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  protected createCloudFrontDistributionForEdge(): Distribution {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const s3Origin = new S3Origin(this.cdk!.bucket);
    const cachePolicy =
      cdk?.serverCachePolicy ??
      this.buildServerCachePolicy([
        "accept",
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree",
      ]);
    const originRequestPolicy = this.buildServerOriginRequestPolicy();
    const functionVersion = this.serverLambdaForEdge!.currentVersion;
    const serverBehavior = this.buildServerBehaviorForEdge(
      functionVersion,
      s3Origin,
      cachePolicy,
      originRequestPolicy
    );

    return new Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk!.certificate,
      defaultBehavior: this.buildDefaultNextjsBehaviorForEdge(
        functionVersion,
        s3Origin,
        cachePolicy,
        originRequestPolicy
      ),
      additionalBehaviors: {
        "api/*": serverBehavior,
        "_next/data/*": serverBehavior,
        "_next/image*": this.buildImageBehavior(cachePolicy),
        "_next/*": this.buildStaticFileBehavior(s3Origin),
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  private buildServerBehaviorForRegional(
    serverOrigin: HttpOrigin,
    cachePolicy: ICachePolicy,
    originRequestPolicy: IOriginRequestPolicy
  ): BehaviorOptions {
    const { cdk } = this.props;
    return {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: this.buildBehaviorFunctionAssociations(),
      origin: serverOrigin,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
      originRequestPolicy,
    };
  }

  private buildServerBehaviorForEdge(
    functionVersion: IVersion,
    s3Origin: S3Origin,
    cachePolicy: ICachePolicy,
    originRequestPolicy: IOriginRequestPolicy
  ): BehaviorOptions {
    const { cdk } = this.props;
    return {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: this.buildBehaviorFunctionAssociations(),
      origin: s3Origin,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
      originRequestPolicy,
      edgeLambdas: [
        {
          includeBody: true,
          eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
          functionVersion,
        },
      ],
    };
  }

  private buildImageBehavior(cachePolicy: ICachePolicy): BehaviorOptions {
    const { cdk } = this.props;
    const imageFn = this.createImageOptimizationFunction();
    const imageFnUrl = imageFn.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });
    return {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new HttpOrigin(Fn.parseDomainName(imageFnUrl.url)),
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
    };
  }

  private buildStaticFileBehavior(s3Origin: S3Origin): BehaviorOptions {
    const { cdk } = this.props;
    return {
      origin: s3Origin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
    };
  }

  private buildDefaultNextjsBehaviorForRegional(
    serverOrigin: HttpOrigin,
    s3Origin: S3Origin,
    cachePolicy: ICachePolicy,
    originRequestPolicy: IOriginRequestPolicy
  ): BehaviorOptions {
    // Create default behavior
    // default handler for requests that don't match any other path:
    //   - try lambda handler first
    //   - if failed, fall back to S3
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const fallbackOriginGroup = new OriginGroup({
      primaryOrigin: serverOrigin,
      fallbackOrigin: s3Origin,
      fallbackStatusCodes: [503],
    });
    return {
      origin: fallbackOriginGroup,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: this.buildBehaviorFunctionAssociations(),
      compress: true,
      cachePolicy,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
      originRequestPolicy,
      ...(cfDistributionProps.defaultBehavior || {}),
    };
  }

  private buildDefaultNextjsBehaviorForEdge(
    functionVersion: IVersion,
    s3Origin: S3Origin,
    cachePolicy: ICachePolicy,
    originRequestPolicy: IOriginRequestPolicy
  ): BehaviorOptions {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    return {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: this.buildBehaviorFunctionAssociations(),
      origin: s3Origin,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
      originRequestPolicy,
      ...(cfDistributionProps.defaultBehavior || {}),
      edgeLambdas: [
        {
          includeBody: true,
          eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
          functionVersion,
        },
        ...(cfDistributionProps.defaultBehavior?.edgeLambdas || []),
      ],
    };
  }

  protected generateBuildId(): string {
    const filePath = path.join(this.props.path, ".next/BUILD_ID");
    return fs.readFileSync(filePath).toString();
  }
}
