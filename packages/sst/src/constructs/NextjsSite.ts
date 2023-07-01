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
  CfnFunction,
  Code,
  Runtime,
  Architecture,
  Function as CdkFunction,
  FunctionUrlAuthType,
  FunctionProps,
} from "aws-cdk-lib/aws-lambda";
import {
  Distribution,
  ViewerProtocolPolicy,
  AllowedMethods,
  BehaviorOptions,
  CachedMethods,
  CachePolicy,
  ICachePolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin, HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
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
  cdk?: SsrSiteProps["cdk"] & {
    revalidation?: Pick<FunctionProps, "vpc" | "vpcSubnets">;
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
      buildCommand: "npx --yes open-next@2.0.3 build",
      ...props,
    });

    this.deferredTaskCallbacks.push(() => {
      this.createWarmer();
      this.createRevalidation();
    });
  }

  protected createRevalidation() {
    if (!this.serverLambdaForRegional && !this.serverLambdaForEdge) return;

    const { cdk } = this.props;

    const queue = new Queue(this, "RevalidationQueue", {
      fifo: true,
      receiveMessageWaitTime: CdkDuration.seconds(20),
    });
    const consumer = new CdkFunction(this, "RevalidationFunction", {
      description: "Next.js revalidator",
      handler: "index.handler",
      code: Code.fromAsset(
        path.join(this.props.path, ".open-next", "revalidation-function")
      ),
      runtime: Runtime.NODEJS_18_X,
      timeout: CdkDuration.seconds(30),
      ...cdk?.revalidation,
    });
    consumer.addEventSource(new SqsEventSource(queue, { batchSize: 5 }));

    // Allow server to send messages to the queue
    const server = this.serverLambdaForRegional || this.serverLambdaForEdge;
    server?.addEnvironment("REVALIDATION_QUEUE_URL", queue.queueUrl);
    server?.addEnvironment("REVALIDATION_QUEUE_REGION", Stack.of(this).region);
    queue.grantSendMessages(server?.role!);
  }

  protected initBuildConfig() {
    return {
      typesPath: ".",
      serverBuildOutputFile: ".open-next/server-function/index.mjs",
      clientBuildOutputDir: ".open-next/assets",
      clientBuildVersionedSubDir: "_next",
      clientBuildS3KeyPrefix: "_assets",
      prerenderedBuildOutputDir: ".open-next/cache",
      prerenderedBuildS3KeyPrefix: "_cache",
    };
  }

  protected createFunctionForRegional() {
    const {
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      cdk,
    } = this.props;
    return new SsrFunction(this, `ServerFunction`, {
      description: "Next.js server",
      bundle: path.join(this.props.path, ".open-next", "server-function"),
      handler: "index.handler",
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment: {
        ...environment,
        CACHE_BUCKET_NAME: this.bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
      ...cdk?.server,
    });
  }

  protected createFunctionForEdge() {
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
      environment: {
        ...environment,
        CACHE_BUCKET_NAME: this.bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
    });
  }

  private createImageOptimizationFunction() {
    const { imageOptimization, path: sitePath } = this.props;

    const fn = new CdkFunction(this, `ImageFunction`, {
      description: "Next.js image optimizer",
      handler: "index.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: RetentionDays.THREE_DAYS,
      code: Code.fromInline("export function handler() {}"),
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
        BUCKET_KEY_PREFIX: "_assets",
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ["s3:GetObject"],
          resources: [this.cdk!.bucket.arnForObjects("*")],
        }),
      ],
    });

    // update code after build
    this.deferredTaskCallbacks.push(() => {
      const cfnFunction = fn.node.defaultChild as CfnFunction;
      const code = Code.fromAsset(
        path.join(sitePath, ".open-next/image-optimization-function")
      );
      const codeConfig = code.bind(fn);
      cfnFunction.code = {
        s3Bucket: codeConfig.s3Location?.bucketName,
        s3Key: codeConfig.s3Location?.objectKey,
        s3ObjectVersion: codeConfig.s3Location?.objectVersion,
      };
      code.bindToResource(cfnFunction);
    });

    return fn;
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
    const cachePolicy =
      cdk?.serverCachePolicy ??
      this.buildServerCachePolicy([
        "accept",
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree",
      ]);
    const serverBehavior = this.buildDefaultBehaviorForRegional(cachePolicy);

    return new Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk!.certificate,
      defaultBehavior: serverBehavior,
      additionalBehaviors: {
        "api/*": serverBehavior,
        "_next/data/*": serverBehavior,
        "_next/image*": this.buildImageBehavior(cachePolicy),
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  protected createCloudFrontDistributionForEdge(): Distribution {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const s3Origin = new S3Origin(this.cdk!.bucket, {
      originPath: "/" + this.buildConfig.clientBuildS3KeyPrefix,
    });
    const cachePolicy =
      cdk?.serverCachePolicy ??
      this.buildServerCachePolicy([
        "accept",
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree",
      ]);
    const serverBehavior = this.buildDefaultBehaviorForEdge(
      s3Origin,
      cachePolicy
    );

    return new Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk!.certificate,
      defaultBehavior: serverBehavior,
      additionalBehaviors: {
        "api/*": serverBehavior,
        "_next/data/*": serverBehavior,
        "_next/image*": this.buildImageBehavior(cachePolicy),
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
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

  protected generateBuildId(): string {
    const filePath = path.join(this.props.path, ".next/BUILD_ID");
    return fs.readFileSync(filePath).toString();
  }

  public getConstructMetadata() {
    return {
      type: "NextjsSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
