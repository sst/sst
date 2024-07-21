import path from "path";
import fs from "fs";
import { globSync } from "glob";
import crypto from "crypto";
import {
  Output,
  Unwrap,
  output,
  all,
  interpolate,
  ComponentResource,
  ComponentResourceOptions,
} from "@pulumi/pulumi";
import { Cdn, CdnArgs } from "./cdn.js";
import { Function, FunctionArgs } from "./function.js";
import { DistributionInvalidation } from "./providers/distribution-invalidation.js";
import { useProvider } from "./helpers/provider.js";
import { Bucket, BucketArgs } from "./bucket.js";
import { BucketFile, BucketFiles } from "./providers/bucket-files.js";
import { sanitizeToPascalCase } from "../naming.js";
import { Input } from "../input.js";
import { transform, type Prettify, type Transform } from "../component.js";
import { VisibleError } from "../error.js";
import { Cron } from "./cron.js";
import { OriginAccessIdentity } from "./providers/origin-access-identity.js";
import { BaseSiteFileOptions } from "../base/base-site.js";
import { BaseSsrSiteArgs } from "../base/base-ssr-site.js";
import {
  cloudfront,
  getPartitionOutput,
  getRegionOutput,
  iam,
  lambda,
  types,
} from "@pulumi/aws";

type CloudFrontFunctionConfig = { injections: string[] };
type EdgeFunctionConfig = { function: Unwrap<FunctionArgs> };
type ServerOriginConfig = { function: Unwrap<FunctionArgs> };
type ImageOptimizationOriginConfig = {
  function: Unwrap<FunctionArgs>;
};
type S3OriginConfig = {
  originPath?: string;
  copy: {
    from: string;
    to: string;
    cached: boolean;
    versionedSubDir?: string;
  }[];
};
type OriginGroupConfig = {
  primaryOriginName: string;
  fallbackOriginName: string;
  fallbackStatusCodes: number[];
};

export type Plan = ReturnType<typeof validatePlan>;
export interface SsrSiteArgs extends BaseSsrSiteArgs {
  domain?: CdnArgs["domain"];
  permissions?: FunctionArgs["permissions"];
  cachePolicy?: Input<string>;
  warm?: Input<number>;
  invalidation?: Input<
    | false
    | {
        /**
         * Configure if `sst deploy` should wait for the CloudFront cache invalidation to finish.
         *
         * :::tip
         * For non-prod environments it might make sense to pass in `false`.
         * :::
         *
         * Waiting for this process to finish ensures that new content will be available after the deploy finishes. However, this process can sometimes take more than 5 mins.
         * @default `false`
         * @example
         * ```js
         * {
         *   invalidation: {
         *     wait: true
         *   }
         * }
         * ```
         */
        wait?: Input<boolean>;
        /**
         * The paths to invalidate.
         *
         * You can either pass in an array of glob patterns to invalidate specific files. Or you can use one of these built-in options:
         * - `all`: All files will be invalidated when any file changes
         * - `versioned`: Only versioned files will be invalidated when versioned files change
         *
         * :::note
         * Each glob pattern counts as a single invalidation. However, invalidating `all` counts as a single invalidation as well.
         * :::
         * @default `"all"`
         * @example
         * Invalidate the `index.html` and all files under the `products/` route. This counts as two invalidations.
         * ```js
         * {
         *   invalidation: {
         *     paths: ["/index.html", "/products/*"]
         *   }
         * }
         * ```
         */
        paths?: Input<"all" | "versioned" | string[]>;
      }
  >;
  /**
   * Configure the Lambda function used for server.
   * @default `{architecture: "x86_64", memory: "1024 MB"}`
   */
  server?: {
    /**
     * The amount of memory allocated to the server function.
     * Takes values between 128 MB and 10240 MB in 1 MB increments.
     *
     * @default `"1024 MB"`
     * @example
     * ```js
     * {
     *   server: {
     *     memory: "2048 MB"
     *   }
     * }
     * ```
     */
    memory?: FunctionArgs["memory"];
    /**
     * The [architecture](https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html)
     * of the server function.
     *
     * @default `"x86_64"`
     * @example
     * ```js
     * {
     *   server: {
     *     architecture: "arm64"
     *   }
     * }
     * ```
     */
    architecture?: FunctionArgs["architecture"];
  };
  vpc?: FunctionArgs["vpc"];
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Bucket resource used for uploading the assets.
     */
    assets?: Transform<BucketArgs>;
    /**
     * Transform the server Function resource.
     */
    server?: Transform<FunctionArgs>;
    /**
     * Transform the image optimization Function resource.
     */
    imageOptimization?: Transform<FunctionArgs>;
    /**
     * Transform the CloudFront CDN resource.
     */
    cdn?: Transform<CdnArgs>;
  };
}

export function prepare(args: SsrSiteArgs, opts: ComponentResourceOptions) {
  const sitePath = normalizeSitePath();
  const partition = normalizePartition();
  const region = normalizeRegion();
  checkSupportedRegion();

  return {
    sitePath,
    partition,
    region,
  };

  function normalizeSitePath() {
    return output(args.path).apply((sitePath) => {
      if (!sitePath) return ".";

      if (!fs.existsSync(sitePath)) {
        throw new VisibleError(`No site found at "${path.resolve(sitePath)}"`);
      }
      return sitePath;
    });
  }

  function normalizePartition() {
    return getPartitionOutput(undefined, { provider: opts?.provider })
      .partition;
  }

  function normalizeRegion() {
    return getRegionOutput(undefined, { provider: opts?.provider }).name;
  }

  function checkSupportedRegion() {
    region.apply((region) => {
      if (
        ![
          "ap-south-2",
          "ap-southeast-4",
          "eu-south-2",
          "eu-central-2",
          "il-central-1",
          "me-central-1",
        ].includes(region)
      )
        return;
      throw new VisibleError(
        `Region ${region} is not currently supported. Please use a different region.`,
      );
    });
  }
}

export function createBucket(
  parent: ComponentResource,
  name: string,
  partition: Output<string>,
  args: SsrSiteArgs,
) {
  const access = createCloudFrontOriginAccessIdentity();
  const bucket = createS3Bucket();
  return { access, bucket };

  function createCloudFrontOriginAccessIdentity() {
    return new OriginAccessIdentity(
      `${name}OriginAccessIdentity`,
      {},
      { parent },
    );
  }

  function createS3Bucket() {
    return new Bucket(
      `${name}Assets`,
      transform(args.transform?.assets, {
        transform: {
          policy: (policyArgs) => {
            const newPolicy = iam.getPolicyDocumentOutput({
              statements: [
                {
                  principals: [
                    {
                      type: "AWS",
                      identifiers: [
                        interpolate`arn:${partition}:iam::cloudfront:user/CloudFront Origin Access Identity ${access.id}`,
                      ],
                    },
                  ],
                  actions: ["s3:GetObject"],
                  resources: [interpolate`${bucket.arn}/*`],
                },
              ],
            }).json;

            policyArgs.policy = output([policyArgs.policy, newPolicy]).apply(
              ([policy, newPolicy]) => {
                const policyJson = JSON.parse(policy as string);
                const newPolicyJson = JSON.parse(newPolicy as string);
                policyJson.Statement.push(...newPolicyJson.Statement);
                return JSON.stringify(policyJson);
              },
            );
          },
        },
      }),
      { parent, retainOnDelete: false },
    );
  }
}

export function createDevServer(
  parent: ComponentResource,
  name: string,
  args: SsrSiteArgs,
) {
  return new Function(
    `${name}DevServer`,
    transform(args.transform?.server, {
      description: `${name} dev server`,
      runtime: "nodejs20.x",
      timeout: "20 seconds",
      memory: "128 MB",
      bundle: path.join($cli.paths.platform, "functions", "empty-function"),
      handler: "index.handler",
      environment: args.environment,
      permissions: args.permissions,
      link: args.link,
      live: false,
    }),
    { parent },
  );
}

export function createServersAndDistribution(
  parent: ComponentResource,
  name: string,
  args: SsrSiteArgs,
  outputPath: Output<string>,
  access: OriginAccessIdentity,
  bucket: Bucket,
  plan: Input<Plan>,
) {
  return all([outputPath, plan]).apply(([outputPath, plan]) => {
    const ssrFunctions: Function[] = [];
    let singletonCachePolicy: cloudfront.CachePolicy;

    const bucketFile = uploadAssets();
    const cfFunctions = createCloudFrontFunctions();
    const edgeFunctions = createEdgeFunctions();
    const origins = buildOrigins();
    const originGroups = buildOriginGroups();
    const distribution = createDistribution();
    allowServerFunctionInvalidateDistribution();
    createDistributionInvalidation();
    createWarmer();

    return {
      distribution,
      ssrFunctions,
      edgeFunctions,
    };

    function uploadAssets() {
      return output(args.assets).apply(async (assets) => {
        // Define content headers
        const versionedFilesTTL = 31536000; // 1 year
        const nonVersionedFilesTTL = 86400; // 1 day

        const bucketFiles: BucketFile[] = [];

        // Handle each S3 origin
        for (const origin of Object.values(plan.origins)) {
          if (!origin.s3) continue;

          // Handle each copy source
          for (const copy of origin.s3.copy) {
            // Build fileOptions
            const fileOptions: BaseSiteFileOptions[] = [
              // unversioned files
              {
                files: "**",
                ignore: copy.versionedSubDir
                  ? path.posix.join(copy.versionedSubDir, "**")
                  : undefined,
                cacheControl:
                  assets?.nonVersionedFilesCacheHeader ??
                  `public,max-age=0,s-maxage=${nonVersionedFilesTTL},stale-while-revalidate=${nonVersionedFilesTTL}`,
              },
              // versioned files
              ...(copy.versionedSubDir
                ? [
                    {
                      files: path.posix.join(copy.versionedSubDir, "**"),
                      cacheControl:
                        assets?.versionedFilesCacheHeader ??
                        `public,max-age=${versionedFilesTTL},immutable`,
                    },
                  ]
                : []),
              ...(assets?.fileOptions ?? []),
            ];

            // Upload files based on fileOptions
            const filesUploaded: string[] = [];
            for (const fileOption of fileOptions.reverse()) {
              const files = globSync(fileOption.files, {
                cwd: path.resolve(outputPath, copy.from),
                nodir: true,
                dot: true,
                ignore: fileOption.ignore,
              }).filter((file) => !filesUploaded.includes(file));

              bucketFiles.push(
                ...(await Promise.all(
                  files.map(async (file) => {
                    const source = path.resolve(outputPath, copy.from, file);
                    const content = await fs.promises.readFile(source);
                    const hash = crypto
                      .createHash("sha256")
                      .update(content)
                      .digest("hex");
                    return {
                      source,
                      key: path.posix.join(copy.to, file),
                      hash,
                      cacheControl: fileOption.cacheControl,
                      contentType: getContentType(file, "UTF-8"),
                    };
                  }),
                )),
              );
              filesUploaded.push(...files);
            }
          }
        }

        return new BucketFiles(
          `${name}AssetFiles`,
          {
            bucketName: bucket.name,
            files: bucketFiles,
          },
          { parent },
        );
      });
    }

    function getContentType(filename: string, textEncoding: string) {
      const ext = filename.endsWith(".well-known/site-association-json")
        ? ".json"
        : path.extname(filename);
      const extensions = {
        [".txt"]: { mime: "text/plain", isText: true },
        [".htm"]: { mime: "text/html", isText: true },
        [".html"]: { mime: "text/html", isText: true },
        [".xhtml"]: { mime: "application/xhtml+xml", isText: true },
        [".css"]: { mime: "text/css", isText: true },
        [".js"]: { mime: "text/javascript", isText: true },
        [".mjs"]: { mime: "text/javascript", isText: true },
        [".apng"]: { mime: "image/apng", isText: false },
        [".avif"]: { mime: "image/avif", isText: false },
        [".gif"]: { mime: "image/gif", isText: false },
        [".jpeg"]: { mime: "image/jpeg", isText: false },
        [".jpg"]: { mime: "image/jpeg", isText: false },
        [".png"]: { mime: "image/png", isText: false },
        [".svg"]: { mime: "image/svg+xml", isText: true },
        [".bmp"]: { mime: "image/bmp", isText: false },
        [".tiff"]: { mime: "image/tiff", isText: false },
        [".webp"]: { mime: "image/webp", isText: false },
        [".ico"]: { mime: "image/vnd.microsoft.icon", isText: false },
        [".eot"]: { mime: "application/vnd.ms-fontobject", isText: false },
        [".ttf"]: { mime: "font/ttf", isText: false },
        [".otf"]: { mime: "font/otf", isText: false },
        [".woff"]: { mime: "font/woff", isText: false },
        [".woff2"]: { mime: "font/woff2", isText: false },
        [".json"]: { mime: "application/json", isText: true },
        [".jsonld"]: { mime: "application/ld+json", isText: true },
        [".xml"]: { mime: "application/xml", isText: true },
        [".pdf"]: { mime: "application/pdf", isText: false },
        [".zip"]: { mime: "application/zip", isText: false },
        [".wasm"]: { mime: "application/wasm", isText: false },
        [".webmanifest"]: { mime: "application/manifest+json", isText: true },
      };
      const extensionData = extensions[ext as keyof typeof extensions];
      const mime = extensionData?.mime ?? "application/octet-stream";
      const charset =
        extensionData?.isText && textEncoding !== "none"
          ? `;charset=${textEncoding}`
          : "";
      return `${mime}${charset}`;
    }

    function createCloudFrontFunctions() {
      const functions: Record<string, cloudfront.Function> = {};

      Object.entries(plan.cloudFrontFunctions ?? {}).forEach(
        ([fnName, { injections }]) => {
          functions[fnName] = new cloudfront.Function(
            `${name}CloudfrontFunction${sanitizeToPascalCase(fnName)}`,
            {
              runtime: "cloudfront-js-1.0",
              code: `
function handler(event) {
  var request = event.request;
  ${injections.join("\n")}
  return request;
}`,
            },
            { parent },
          );
        },
      );
      return functions;
    }

    function createEdgeFunctions() {
      const functions: Record<string, Function> = {};

      Object.entries(plan.edgeFunctions ?? {}).forEach(
        ([fnName, { function: props }]) => {
          // Edge functions don't support linking
          output(args.link).apply((link) => {
            if (link?.length)
              throw new VisibleError(
                `Resource linking is not currently supported when deploying to the edge.`,
              );
          });

          const fn = new Function(
            `${name}Edge${sanitizeToPascalCase(fnName)}`,
            {
              runtime: "nodejs20.x",
              timeout: "20 seconds",
              memory: "1024 MB",
              ...props,
              nodejs: {
                format: "esm" as const,
                ...props.nodejs,
              },
              environment: output(args.environment).apply((environment) => ({
                ...environment,
                ...props.environment,
              })),
              link: output(args.link).apply((link) => [
                ...(props.link ?? []),
                ...(link ?? []),
              ]),
              transform: {
                function: (args) => {
                  args.publish = true;
                },
              },
              live: false,
            },
            { provider: useProvider("us-east-1"), parent },
          );

          functions[fnName] = fn;
        },
      );
      return functions;
    }

    function buildOrigins() {
      const origins: Record<string, types.input.cloudfront.DistributionOrigin> =
        {};

      Object.entries(plan.origins ?? {}).forEach(([name, props]) => {
        if (props.s3) {
          origins[name] = buildS3Origin(name, props.s3);
        } else if (props.server) {
          origins[name] = buildServerOrigin(name, props.server);
        } else if (props.imageOptimization) {
          origins[name] = buildImageOptimizationOrigin(
            name,
            props.imageOptimization,
          );
        }
      });

      return origins;
    }

    function buildOriginGroups() {
      const originGroups: Record<
        string,
        types.input.cloudfront.DistributionOriginGroup
      > = {};

      Object.entries(plan.origins ?? {}).forEach(([name, props]) => {
        if (props.group) {
          originGroups[name] = {
            originId: name,
            failoverCriteria: {
              statusCodes: props.group.fallbackStatusCodes,
            },
            members: [
              { originId: props.group.primaryOriginName },
              { originId: props.group.fallbackOriginName },
            ],
          };
        }
      });

      return originGroups;
    }

    function buildS3Origin(name: string, props: S3OriginConfig) {
      return {
        originId: name,
        domainName: bucket.nodes.bucket.bucketRegionalDomainName,
        originPath: props.originPath ? `/${props.originPath}` : "",
        s3OriginConfig: {
          originAccessIdentity: interpolate`origin-access-identity/cloudfront/${access.id}`,
        },
      };
    }

    function buildServerOrigin(fnName: string, props: ServerOriginConfig) {
      const fn = new Function(
        `${name}${sanitizeToPascalCase(fnName)}`,
        transform(args.transform?.server, {
          description: `${name} server`,
          runtime: "nodejs20.x",
          timeout: "20 seconds",
          memory: output(args.server?.memory).apply((v) => v ?? "1024 MB"),
          architecture: output(args.server?.architecture).apply(
            (v) => v ?? "x86_64",
          ),
          vpc: args.vpc,
          ...props.function,
          nodejs: {
            format: "esm" as const,
            ...props.function.nodejs,
          },
          environment: output(args.environment).apply((environment) => ({
            ...environment,
            ...props.function.environment,
          })),
          permissions: output(args.permissions).apply((permissions) => [
            ...(permissions ?? []),
            ...(props.function.permissions ?? []),
          ]),
          injections: args.warm
            ? [useServerFunctionWarmingInjection(props.function.streaming)]
            : [],
          link: output(args.link).apply((link) => [
            ...(props.function.link ?? []),
            ...(link ?? []),
          ]),
          url: true,
          live: false,
        }),
        { parent },
      );
      ssrFunctions.push(fn);

      return {
        originId: fnName,
        domainName: fn.url.apply((url) => new URL(url!).host),
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "https-only",
          originReadTimeout: 20,
          originSslProtocols: ["TLSv1.2"],
        },
      };
    }

    function buildImageOptimizationOrigin(
      fnName: string,
      props: ImageOptimizationOriginConfig,
    ) {
      const fn = new Function(
        `${name}${sanitizeToPascalCase(fnName)}`,
        transform(args.transform?.imageOptimization, {
          timeout: "25 seconds",
          logging: {
            retention: "3 days",
          },
          permissions: [
            {
              actions: ["s3:GetObject"],
              resources: [interpolate`${bucket.arn}/*`],
            },
          ],
          ...props.function,
          url: true,
          live: false,
          _skipMetadata: true,
        }),
        { parent },
      );

      return {
        originId: fnName,
        domainName: fn.url.apply((url) => new URL(url!).host),
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "https-only",
          originReadTimeout: 20,
          originSslProtocols: ["TLSv1.2"],
        },
      };
    }

    function buildBehavior(behavior: Plan["behaviors"][number]) {
      const edgeFunction = edgeFunctions[behavior.edgeFunction || ""];
      const cfFunction = cfFunctions[behavior.cfFunction || ""];

      if (behavior.cacheType === "static") {
        return {
          targetOriginId: behavior.origin,
          viewerProtocolPolicy: "redirect-to-https",
          allowedMethods: behavior.allowedMethods ?? ["GET", "HEAD", "OPTIONS"],
          cachedMethods: ["GET", "HEAD"],
          compress: true,
          // CloudFront's managed CachingOptimized policy
          cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          functionAssociations: cfFunction
            ? [
                {
                  eventType: "viewer-request",
                  functionArn: cfFunction.arn,
                },
              ]
            : [],
        };
      } else if (behavior.cacheType === "server") {
        return {
          targetOriginId: behavior.origin,
          viewerProtocolPolicy: "redirect-to-https",
          allowedMethods: behavior.allowedMethods ?? [
            "DELETE",
            "GET",
            "HEAD",
            "OPTIONS",
            "PATCH",
            "POST",
            "PUT",
          ],
          cachedMethods: ["GET", "HEAD"],
          compress: true,
          cachePolicyId: args.cachePolicy ?? useServerBehaviorCachePolicy().id,
          // CloudFront's Managed-AllViewerExceptHostHeader policy
          originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
          functionAssociations: cfFunction
            ? [
                {
                  eventType: "viewer-request",
                  functionArn: cfFunction.arn,
                },
              ]
            : [],
          lambdaFunctionAssociations: edgeFunction
            ? [
                {
                  includeBody: true,
                  eventType: "origin-request",
                  lambdaArn: edgeFunction.nodes.function.qualifiedArn,
                },
              ]
            : [],
        };
      }

      throw new VisibleError(`Invalid behavior type in the "${name}" site.`);
    }

    function useServerBehaviorCachePolicy() {
      singletonCachePolicy =
        singletonCachePolicy ??
        new cloudfront.CachePolicy(
          `${name}ServerCachePolicy`,
          {
            comment: "SST server response cache policy",
            defaultTtl: 0,
            maxTtl: 31536000, // 1 year
            minTtl: 0,
            parametersInCacheKeyAndForwardedToOrigin: {
              cookiesConfig: {
                cookieBehavior: "none",
              },
              headersConfig:
                (plan.serverCachePolicy?.allowedHeaders ?? []).length > 0
                  ? {
                      headerBehavior: "whitelist",
                      headers: {
                        items: plan.serverCachePolicy?.allowedHeaders,
                      },
                    }
                  : {
                      headerBehavior: "none",
                    },
              queryStringsConfig: {
                queryStringBehavior: "all",
              },
              enableAcceptEncodingBrotli: true,
              enableAcceptEncodingGzip: true,
            },
          },
          { parent },
        );
      return singletonCachePolicy;
    }

    function useServerFunctionWarmingInjection(streaming?: boolean) {
      return [
        `if (event.type === "warmer") {`,
        `  const p = new Promise((resolve) => {`,
        `    setTimeout(() => {`,
        `      resolve({ serverId: "server-" + Math.random().toString(36).slice(2, 8) });`,
        `    }, event.delay);`,
        `  });`,
        ...(streaming
          ? [
              `  const response = await p;`,
              `  responseStream.write(JSON.stringify(response));`,
              `  responseStream.end();`,
              `  return;`,
            ]
          : [`  return p;`]),
        `}`,
      ].join("\n");
    }

    function createDistribution() {
      return new Cdn(
        `${name}Cdn`,
        transform(args.transform?.cdn, {
          comment: `${name} app`,
          origins: Object.values(origins),
          originGroups: Object.values(originGroups),
          defaultRootObject: plan.defaultRootObject ?? "",
          defaultCacheBehavior: buildBehavior(
            plan.behaviors.find((behavior) => !behavior.pattern)!,
          ),
          orderedCacheBehaviors: plan.behaviors
            .filter((behavior) => behavior.pattern)
            .map((behavior) => ({
              pathPattern: behavior.pattern!,
              ...buildBehavior(behavior),
            })),
          customErrorResponses: plan.errorResponses,
          domain: args.domain,
        }),
        // create distribution after assets are uploaded
        { dependsOn: bucketFile, parent },
      );
    }

    function allowServerFunctionInvalidateDistribution() {
      const policy = new iam.Policy(
        `${name}InvalidationPolicy`,
        {
          policy: interpolate`{
            "Version": "2012-10-17",
            "Statement": [
              {
                "Action": "cloudfront:CreateInvalidation",
                "Effect": "Allow",
                "Resource": "${distribution.nodes.distribution.arn}"
              }
            ]
          }`,
        },
        { parent },
      );

      for (const fn of [...ssrFunctions, ...Object.values(edgeFunctions)]) {
        fn.nodes.function.name.apply((functionName) => {
          const uniqueHash = crypto
            .createHash("md5")
            .update(functionName)
            .digest("hex")
            .substring(0, 4);

          new iam.RolePolicyAttachment(
            `${name}InvalidationPolicyAttachment${uniqueHash}`,
            {
              policyArn: policy.arn,
              role: fn.nodes.role!.name,
            },
            { parent },
          );
        });
      }
    }

    function createWarmer() {
      // note: Currently all sites have a single server function. When we add
      //       support for multiple server functions (ie. route splitting), we
      //       need to handle warming multiple functions.
      if (!args.warm) return;

      if (args.warm && plan.edge) {
        throw new VisibleError(
          `In the "${name}" Site, warming is currently supported only for the regional mode.`,
        );
      }

      if (ssrFunctions.length === 0) return;

      // Create cron job
      const cron = new Cron(
        `${name}Warmer`,
        {
          schedule: "rate(5 minutes)",
          job: {
            description: `${name} warmer`,
            bundle: path.join($cli.paths.platform, "dist", "ssr-warmer"),
            runtime: "nodejs20.x",
            handler: "index.handler",
            timeout: "900 seconds",
            memory: "128 MB",
            live: false,
            environment: {
              FUNCTION_NAME: ssrFunctions[0].nodes.function.name,
              CONCURRENCY: output(args.warm).apply((warm) => warm.toString()),
            },
            link: [ssrFunctions[0]],
            _skipMetadata: true,
          },
          transform: {
            target: (args) => {
              args.retryPolicy = {
                maximumRetryAttempts: 0,
                maximumEventAgeInSeconds: 60,
              };
            },
          },
        },
        { parent },
      );

      // Prewarm on deploy
      new lambda.Invocation(
        `${name}Prewarm`,
        {
          functionName: cron.nodes.job.name,
          triggers: {
            version: Date.now().toString(),
          },
          input: JSON.stringify({}),
        },
        { parent },
      );
    }

    function createDistributionInvalidation() {
      all([outputPath, args.invalidation]).apply(
        ([outputPath, invalidationRaw]) => {
          // Normalize invalidation
          if (invalidationRaw === false) return;
          const invalidation = {
            wait: false,
            paths: "all",
            ...invalidationRaw,
          };

          // We will generate a hash based on the contents of the S3 files with cache enabled.
          // This will be used to determine if we need to invalidate our CloudFront cache.
          const s3Origin = Object.values(plan.origins).find(
            (origin) => origin.s3,
          )?.s3;
          if (!s3Origin) return;
          const cachedS3Files = s3Origin.copy.filter((file) => file.cached);
          if (cachedS3Files.length === 0) return;

          // Build invalidation paths
          const invalidationPaths: string[] = [];
          if (invalidation.paths === "all") {
            invalidationPaths.push("/*");
          } else if (invalidation.paths === "versioned") {
            cachedS3Files.forEach((item) => {
              if (!item.versionedSubDir) return;
              invalidationPaths.push(
                path.posix.join("/", item.to, item.versionedSubDir, "*"),
              );
            });
          } else {
            invalidationPaths.push(...(invalidation?.paths || []));
          }
          if (invalidationPaths.length === 0) return;

          // Build build ID
          let invalidationBuildId: string;
          if (plan.buildId) {
            invalidationBuildId = plan.buildId;
          } else {
            const hash = crypto.createHash("md5");

            cachedS3Files.forEach((item) => {
              // The below options are needed to support following symlinks when building zip files:
              // - nodir: This will prevent symlinks themselves from being copied into the zip.
              // - follow: This will follow symlinks and copy the files within.

              // For versioned files, use file path for digest since file version in name should change on content change
              if (item.versionedSubDir) {
                globSync("**", {
                  dot: true,
                  nodir: true,
                  follow: true,
                  cwd: path.resolve(
                    outputPath,
                    item.from,
                    item.versionedSubDir,
                  ),
                }).forEach((filePath) => hash.update(filePath));
              }

              // For non-versioned files, use file content for digest
              if (invalidation.paths !== "versioned") {
                globSync("**", {
                  ignore: item.versionedSubDir
                    ? [path.posix.join(item.versionedSubDir, "**")]
                    : undefined,
                  dot: true,
                  nodir: true,
                  follow: true,
                  cwd: path.resolve(outputPath, item.from),
                }).forEach((filePath) =>
                  hash.update(
                    fs.readFileSync(
                      path.resolve(outputPath, item.from, filePath),
                    ),
                  ),
                );
              }
            });
            invalidationBuildId = hash.digest("hex");
          }

          new DistributionInvalidation(
            `${name}Invalidation`,
            {
              distributionId: distribution.nodes.distribution.id,
              paths: invalidationPaths,
              version: invalidationBuildId,
              wait: invalidation.wait,
            },
            { parent },
          );
        },
      );
    }
  });
}

export function useCloudFrontFunctionHostHeaderInjection() {
  return `request.headers["x-forwarded-host"] = request.headers.host;`;
}

export function validatePlan<
  CloudFrontFunctions extends Record<
    string,
    Prettify<CloudFrontFunctionConfig>
  >,
  EdgeFunctions extends Record<string, Prettify<EdgeFunctionConfig>>,
  Origins extends Record<
    string,
    {
      server?: Prettify<ServerOriginConfig>;
      imageOptimization?: Prettify<ImageOptimizationOriginConfig>;
      s3?: Prettify<S3OriginConfig>;
      group?: Prettify<OriginGroupConfig>;
    }
  >,
>(input: {
  cloudFrontFunctions?: CloudFrontFunctions;
  edgeFunctions?: EdgeFunctions;
  /**
   * Each origin can be either an S3, server, image optimization, or group origin.
   */
  origins: Origins;
  edge: boolean;
  behaviors: {
    cacheType: "server" | "static";
    pattern?: string;
    origin: keyof Origins;
    allowedMethods?: (
      | "DELETE"
      | "GET"
      | "HEAD"
      | "OPTIONS"
      | "PATCH"
      | "POST"
      | "PUT"
    )[];
    cfFunction?: keyof CloudFrontFunctions;
    edgeFunction?: keyof EdgeFunctions;
  }[];
  defaultRootObject?: cloudfront.DistributionArgs["defaultRootObject"];
  errorResponses?: types.input.cloudfront.DistributionCustomErrorResponse[];
  serverCachePolicy?: {
    allowedHeaders?: string[];
  };
  buildId?: string;
}) {
  Object.entries(input.origins).forEach(([originName, origin]) => {
    if (
      !origin.s3 &&
      !origin.server &&
      !origin.imageOptimization &&
      !origin.group
    ) {
      throw new VisibleError(
        `Invalid origin "${originName}" definition. Each origin must be an S3, server, image optimization, or group origin.`,
      );
    }
  });
  return input;
}
