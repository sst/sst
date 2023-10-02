import fs from "fs";
import path from "path";
import { Construct } from "constructs";
import { Duration as CdkDuration, CustomResource } from "aws-cdk-lib/core";
import {
  Code,
  Runtime,
  Function as CdkFunction,
  FunctionProps,
  Architecture,
} from "aws-cdk-lib/aws-lambda";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Stack } from "./Stack.js";
import { SsrSite, SsrSiteProps } from "./SsrSite.js";
import { Size, toCdkSize } from "./util/size.js";
import { App } from "./App.js";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export interface NextjsSiteProps extends Omit<SsrSiteProps, "nodejs"> {
  experimentalStreaming?: boolean;
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
  cdk?: SsrSiteProps["cdk"] & {
    revalidation?: Pick<FunctionProps, "vpc" | "vpcSubnets">;
    /**
     * Override the CloudFront cache policy properties for responses from the
     * server rendering Lambda.
     *
     * @default
     * By default, the cache policy is configured to cache all responses from
     * the server rendering Lambda based on the query-key only. If you're using
     * cookie or header based authentication, you'll need to override the
     * cache policy to cache based on those values as well.
     *
     * ```js
     * serverCachePolicy: new CachePolicy(this, "ServerCache", {
     *   queryStringBehavior: CacheQueryStringBehavior.all()
     *   headerBehavior: CacheHeaderBehavior.allowList(
     *     "accept",
     *     "rsc",
     *     "next-router-prefetch",
     *     "next-router-state-tree",
     *     "next-url",
     *   ),
     *   cookieBehavior: CacheCookieBehavior.none()
     *   defaultTtl: Duration.days(0)
     *   maxTtl: Duration.days(365)
     *   minTtl: Duration.days(0)
     * })
     * ```
     */
    serverCachePolicy?: NonNullable<SsrSiteProps["cdk"]>["serverCachePolicy"];
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
      buildCommand: `npx --yes open-next@2.2.0 build ${props?.experimentalStreaming ? "--streaming" : ""}`,
      ...props,
    });

    this.createRevalidation();
  }

  protected plan(bucket: Bucket) {
    const { path: sitePath, edge, imageOptimization, experimentalStreaming } = this.props;
    const serverConfig = {
      description: "Next.js server",
      bundle: path.join(sitePath, ".open-next", "server-function"),
      handler: "index.handler",
      environment: {
        CACHE_BUCKET_NAME: bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
    };
    return this.validatePlan({
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        },
      },
      edgeFunctions: edge
        ? {
            edgeServer: {
              constructId: "ServerFunction",
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
                constructId: "ServerFunction",
                function: serverConfig,
                streaming: experimentalStreaming,
              },
            }),
        imageOptimizer: {
          type: "image-optimization-function",
          constructId: "ImageFunction",
          function: {
            description: "Next.js image optimizer",
            handler: "index.handler",
            code: Code.fromAsset(
              path.join(sitePath, ".open-next/image-optimization-function")
            ),
            runtime: Runtime.NODEJS_18_X,
            architecture: Architecture.ARM_64,
            environment: {
              BUCKET_NAME: bucket.bucketName,
              BUCKET_KEY_PREFIX: "_assets",
            },
            memorySize: imageOptimization?.memorySize
              ? typeof imageOptimization.memorySize === "string"
                ? toCdkSize(imageOptimization.memorySize).toMebibytes()
                : imageOptimization.memorySize
              : 1536,
          },
        },
        s3: {
          type: "s3",
          originPath: "_assets",
          copy: [
            {
              from: ".open-next/assets",
              to: "_assets",
              cached: true,
              versionedSubDir: "_next",
            },
            { from: ".open-next/cache", to: "_cache", cached: false },
          ],
        },
      },
      behaviors: [
        ...(edge
          ? [
              {
                cacheType: "server",
                cfFunction: "serverCfFunction",
                edgeFunction: "edgeServer",
                origin: "s3",
              } as const,
              {
                cacheType: "server",
                pattern: "api/*",
                cfFunction: "serverCfFunction",
                edgeFunction: "edgeServer",
                origin: "s3",
              } as const,
              {
                cacheType: "server",
                pattern: "_next/data/*",
                cfFunction: "serverCfFunction",
                edgeFunction: "edgeServer",
                origin: "s3",
              } as const,
            ]
          : [
              {
                cacheType: "server",
                cfFunction: "serverCfFunction",
                origin: "regionalServer",
              } as const,
              {
                cacheType: "server",
                pattern: "api/*",
                cfFunction: "serverCfFunction",
                origin: "regionalServer",
              } as const,
              {
                cacheType: "server",
                pattern: "_next/data/*",
                cfFunction: "serverCfFunction",
                origin: "regionalServer",
              } as const,
            ]),
        {
          cacheType: "server",
          pattern: "_next/image*",
          cfFunction: "serverCfFunction",
          origin: "imageOptimizer",
        },
        // create 1 behaviour for each top level asset file/folder
        ...fs.readdirSync(path.join(sitePath, ".open-next/assets")).map(
          (item) =>
            ({
              cacheType: "static",
              pattern: fs
                .statSync(path.join(sitePath, ".open-next/assets", item))
                .isDirectory()
                ? `${item}/*`
                : item,
              origin: "s3",
            } as const)
        ),
      ],
      cachePolicyAllowedHeaders: [
        "accept",
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree",
        "next-url",
      ],
      buildId: fs
        .readFileSync(path.join(sitePath, ".next/BUILD_ID"))
        .toString(),
      warmerConfig: {
        function: path.join(sitePath, ".open-next", "warmer-function"),
      },
    });
  }

  protected createRevalidation() {
    if (!this.serverFunction) return;

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
    const server = this.serverFunction;
    server?.addEnvironment("REVALIDATION_QUEUE_URL", queue.queueUrl);
    server?.addEnvironment("REVALIDATION_QUEUE_REGION", Stack.of(this).region);
    queue.grantSendMessages(server?.role!);

    const app = this.node.root as App;

    const table = new Table(this, "RevalidationTable", {
      partitionKey: { name: "tag", type: AttributeType.STRING },
      sortKey: { name: "path", type: AttributeType.STRING },
      pointInTimeRecovery: true,
      billingMode: BillingMode.PAY_PER_REQUEST,
      tableName: app.logicalPrefixedName("next-revalidation-table"),
    });

    table.addGlobalSecondaryIndex({
      indexName: "revalidate",
      partitionKey: { name: "path", type: AttributeType.STRING },
      sortKey: { name: "revalidatedAt", type: AttributeType.NUMBER },
    });

    server?.addEnvironment("CACHE_DYNAMO_TABLE", table.tableName);
    table.grantReadWriteData(server?.role!);

    const dynamodbProviderPath = path.join(this.props.path, ".open-next", "dynamodb-provider");

    if(fs.existsSync(dynamodbProviderPath)) {
      const insertFn = new CdkFunction(this, "RevalidationInsertFunction", {
        description: "Next.js revalidation data insert",
        handler: "index.handler",
        code: Code.fromAsset(
          path.join(this.props.path, ".open-next", "dynamodb-provider")
        ),
        runtime: Runtime.NODEJS_18_X,
        timeout: CdkDuration.minutes(14),
        initialPolicy: [
          new PolicyStatement({
            actions: [
              "dynamodb:BatchWriteItem",
              "dynamodb:PutItem",
              "dynamodb:DescribeTable",
            ],
            resources: [table.tableArn],
          }),
        ],
        environment: {
          CACHE_DYNAMO_TABLE: table.tableName,
        }
      });
  
      const provider = new Provider(this, "RevalidationProvider", {
        onEventHandler: insertFn,
        logRetention: RetentionDays.ONE_DAY,
      });
  
      new CustomResource(this, "RevalidationResource", {
        serviceToken: provider.serviceToken,
        properties: {
          version: Date.now().toString()
        }
      });
    }
  }

  public getConstructMetadata() {
    return {
      type: "NextjsSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
