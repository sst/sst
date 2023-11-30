import path from "path";
import url from "url";
import fs from "fs";
import { globSync } from "glob";
import crypto from "crypto";
import { execSync } from "child_process";
import pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Distribution, DistributionDomainArgs } from "./distribution.js";
import { Function, FunctionArgs, FunctionNodeJSArgs } from "./function.js";
import { Duration, toSeconds } from "./util/duration.js";
import { DistributionInvalidation } from "./distribution-invalidation.js";

type CloudFrontFunctionConfig = { injections: string[] };
type EdgeFunctionConfig = { function: pulumi.Unwrap<FunctionArgs> };
type FunctionOriginConfig = {
  type: "function";
  function: pulumi.Unwrap<FunctionArgs>;
  injections?: string[];
  streaming?: boolean;
};
type ImageOptimizationFunctionOriginConfig = {
  type: "image-optimization-function";
  function: pulumi.Unwrap<FunctionArgs>;
};
type S3OriginConfig = {
  type: "s3";
  originPath?: string;
  copy: {
    from: string;
    to: string;
    cached: boolean;
    versionedSubDir?: string;
  }[];
};
type OriginGroupConfig = {
  type: "group";
  primaryOriginName: string;
  fallbackOriginName: string;
  fallbackStatusCodes: number[];
};

export type Plan = ReturnType<typeof validatePlan>;
export interface SsrDomainArgs extends DistributionDomainArgs {}
export interface SsrSiteFileOptions {
  files: string | string[];
  ignore?: string | string[];
  cacheControl?: string;
  contentType?: string;
}
export interface SsrSiteArgs {
  /**
   * Bind resources for the function
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   bind: [STRIPE_KEY, bucket],
   * })
   * ```
   */
  // TODO implement bind
  //bind?: SSTConstruct[];
  /**
   * Path to the directory where the app is located.
   * @default "."
   */
  path?: pulumi.Input<string>;
  /**
   * Path relative to the app location where the type definitions are located.
   * @default "."
   */
  typesPath?: pulumi.Input<string>;
  /**
   * The command for building the website
   * @default `npm run build`
   * @example
   * ```js
   * buildCommand: "yarn build",
   * ```
   */
  buildCommand?: pulumi.Input<string>;
  /**
   * The customDomain for this website. SST supports domains that are hosted
   * either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js
   * customDomain: "domain.com",
   * ```
   *
   * ```js
   * customDomain: {
   *   domainName: "domain.com",
   *   redirects: ["www.domain.com"],
   *   hostedZone: "domain.com"
   * },
   * ```
   */
  customDomain?: pulumi.Input<string | SsrDomainArgs>;
  /**
   * Attaches the given list of permissions to the SSR function. Configuring this property is equivalent to calling `attachPermissions()` after the site is created.
   * @example
   * ```js
   * permissions: ["ses"]
   * ```
   */
  // TODO implement permissions
  //permissions?: pulumi.Input<Permissions>;
  /**
   * An object with the key being the environment variable name.
   *
   * @example
   * ```js
   * environment: {
   *   API_URL: api.url,
   *   USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   * },
   * ```
   */
  environment?: pulumi.Input<Record<string, pulumi.Input<string>>>;
  /**
   * The number of server functions to keep warm. This option is only supported for the regional mode.
   * @default Server function is not kept warm
   */
  warm?: pulumi.Input<number>;
  // TODO implement `sst dev`
  //dev?: {
  //  /**
  //   * When running `sst dev`, site is not deployed. This is to ensure `sst dev` can start up quickly.
  //   * @default false
  //   * @example
  //   * ```js
  //   * dev: {
  //   *   deploy: true
  //   * }
  //   * ```
  //   */
  //  deploy?: boolean;
  //  /**
  //   * The local site URL when running `sst dev`.
  //   * @example
  //   * ```js
  //   * dev: {
  //   *   url: "http://localhost:3000"
  //   * }
  //   * ```
  //   */
  //  url?: string;
  //};
  assets?: pulumi.Input<{
    /**
     * Character encoding for text based assets uploaded to S3 (ex: html, css, js, etc.). If "none" is specified, no charset will be returned in header.
     * @default utf-8
     * @example
     * ```js
     * assets: {
     *   textEncoding: "iso-8859-1"
     * }
     * ```
     */
    textEncoding?: pulumi.Input<
      "utf-8" | "iso-8859-1" | "windows-1252" | "ascii" | "none"
    >;
    /**
     * The TTL for versioned files (ex: `main-1234.css`) in the CDN and browser cache. Ignored when `versionedFilesCacheHeader` is specified.
     * @default 1 year
     * @example
     * ```js
     * assets: {
     *   versionedFilesTTL: "30 days"
     * }
     * ```
     */
    versionedFilesTTL?: pulumi.Input<number | Duration>;
    /**
     * The header to use for versioned files (ex: `main-1234.css`) in the CDN cache. When specified, the `versionedFilesTTL` option is ignored.
     * @default public,max-age=31536000,immutable
     * @example
     * ```js
     * assets: {
     *   versionedFilesCacheHeader: "public,max-age=31536000,immutable"
     * }
     * ```
     */
    versionedFilesCacheHeader?: pulumi.Input<string>;
    /**
     * The TTL for non-versioned files (ex: `index.html`) in the CDN cache. Ignored when `nonVersionedFilesCacheHeader` is specified.
     * @default 1 day
     * @example
     * ```js
     * assets: {
     *   nonVersionedFilesTTL: "4 hours"
     * }
     * ```
     */
    nonVersionedFilesTTL?: pulumi.Input<number | Duration>;
    /**
     * The header to use for non-versioned files (ex: `index.html`) in the CDN cache. When specified, the `nonVersionedFilesTTL` option is ignored.
     * @default public,max-age=0,s-maxage=86400,stale-while-revalidate=8640
     * @example
     * ```js
     * assets: {
     *   nonVersionedFilesCacheHeader: "public,max-age=0,no-cache"
     * }
     * ```
     */
    nonVersionedFilesCacheHeader?: pulumi.Input<string>;
    /**
     * List of file options to specify cache control and content type for cached files. These file options are appended to the default file options so it's possible to override the default file options by specifying an overlapping file pattern.
     * @example
     * ```js
     * assets: {
     *   fileOptions: [
     *     {
     *       files: "**\/*.zip",
     *       cacheControl: "private,no-cache,no-store,must-revalidate",
     *       contentType: "application/zip",
     *     },
     *   ],
     * }
     * ```
     */
    fileOptions?: pulumi.Input<SsrSiteFileOptions[]>;
  }>;
  invalidation?: pulumi.Input<{
    /**
     * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
     * @default false
     * @example
     * ```js
     * invalidation: {
     *   wait: true,
     * }
     * ```
     */
    wait?: pulumi.Input<boolean>;
    /**
     * The paths to invalidate. There are three built-in options:
     * - "none" - No invalidation will be performed.
     * - "all" - All files will be invalidated when any file changes.
     * - "versioned" - Only versioned files will be invalidated when versioned files change.
     * Alternatively you can pass in an array of paths to invalidate.
     * @default "all"
     * @example
     * Disable invalidation:
     * ```js
     * invalidation: {
     *   paths: "none",
     * }
     * ```
     * Invalidate "index.html" and all files under the "products" route:
     * ```js
     * invalidation: {
     *   paths: ["/index.html", "/products/*"],
     * }
     * ```
     */
    paths?: pulumi.Input<"none" | "all" | "versioned" | string[]>;
  }>;
}

export function prepare(args: SsrSiteArgs) {
  const sitePath = normalizeSitePath();
  const invalidation = normalizeInvalidation();
  writeTypesFile();

  const doNotDeploy = pulumi.output(false);
  //const doNotDeploy = app.mode === "dev" && !dev?.deploy;
  return { sitePath, invalidation, doNotDeploy };

  function normalizeSitePath() {
    return pulumi.all([args.path]).apply(([sitePath]) => {
      if (!sitePath) return ".";

      if (!fs.existsSync(sitePath)) {
        throw new Error(`No site found at "${path.resolve(sitePath)}"`);
      }
      return sitePath;
    });
  }

  function normalizeInvalidation() {
    return pulumi.all([args.invalidation]).apply(([invalidation]) => {
      return invalidation
        ? { paths: "all", wait: false, ...invalidation }
        : { paths: "all", wait: false };
    });
  }

  function writeTypesFile() {
    return pulumi
      .all([sitePath, args.typesPath])
      .apply(([sitePath, typesPath]) => {
        const filePath = path.resolve(
          sitePath,
          typesPath || ".",
          "sst-env.d.ts",
        );

        // Do not override the types file if it already exists
        if (fs.existsSync(filePath)) return;

        const relPathToSstTypesFile = path.join(
          path.relative(path.dirname(filePath), app.paths.root),
          ".sst/types/index.ts",
        );
        fs.writeFileSync(
          filePath,
          `/// <reference path="${relPathToSstTypesFile}" />`,
        );
      });
  }
}
export function buildApp(
  name: string,
  args: SsrSiteArgs,
  sitePath: pulumi.Output<string>,
  buildCommand: pulumi.Output<string>,
) {
  const defaultCommand = "npm run build";

  return pulumi
    .all([sitePath, buildCommand, args.environment])
    .apply(([sitePath, buildCommand, environment]) => {
      const cmd = buildCommand || defaultCommand;

      if (cmd === defaultCommand) {
        // Ensure that the site has a build script defined
        if (!fs.existsSync(path.join(sitePath, "package.json"))) {
          throw new Error(`No package.json found at "${sitePath}".`);
        }
        const packageJson = JSON.parse(
          fs.readFileSync(path.join(sitePath, "package.json")).toString(),
        );
        if (!packageJson.scripts || !packageJson.scripts.build) {
          throw new Error(
            `No "build" script found within package.json in "${sitePath}".`,
          );
        }
      }

      // Run build
      console.debug(`Running "${cmd}" script`);
      try {
        execSync(cmd, {
          cwd: sitePath,
          stdio: "inherit",
          env: {
            SST: "1",
            ...process.env,
            ...environment,
          },
        });
      } catch (e) {
        throw new Error(`There was a problem building the "${name}" site.`);
      }

      return sitePath;
    });
}

export function createBucket(name: string) {
  const access = createCloudFrontOriginAccessIdentity();
  const bucket = createS3Bucket();
  return { access, bucket };

  function createCloudFrontOriginAccessIdentity() {
    return new aws.cloudfront.OriginAccessIdentity(
      `${name}-origin-access-identity`,
      {},
    );
  }

  function createS3Bucket() {
    // TODO add "enforceSSL: true"
    const bucket = new aws.s3.BucketV2(`${name}-bucket`, {
      forceDestroy: true,
    });
    new aws.s3.BucketPublicAccessBlock(`${name}-bucket-public-access-block`, {
      bucket: bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });
    // allow access from another account bucket policy
    const policyDocument = aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          principals: [
            {
              type: "AWS",
              identifiers: [access.iamArn],
            },
          ],
          actions: ["s3:GetObject"],
          resources: [pulumi.interpolate`${bucket.arn}/*`],
        },
      ],
    });
    new aws.s3.BucketPolicy(`${name}-bucket-policy`, {
      bucket: bucket.id,
      policy: policyDocument.json,
    });
    return bucket;
  }
}

export function createServersAndDistribution(
  name: string,
  args: SsrSiteArgs,
  outputPath: pulumi.Output<string>,
  access: aws.cloudfront.OriginAccessIdentity,
  bucket: aws.s3.BucketV2,
  plan: pulumi.Input<Plan>,
) {
  return pulumi.all([plan]).apply(([plan]) => {
    const ssrFunctions: Function[] = [];
    let singletonCachePolicy: aws.cloudfront.CachePolicy;

    const uploadedObjects = uploadAssets();
    const cfFunctions = createCloudFrontFunctions();
    const edgeFunctions = createEdgeFunctions();
    const origins = buildOrigins();
    const originGroups = buildOriginGroups();
    const distribution = createCloudFrontDistribution();
    allowServerFunctionInvalidateDistribution();
    createDistributionInvalidation();
    createWarmer();

    return { distribution, ssrFunctions, edgeFunctions };

    function uploadAssets() {
      return pulumi.all([args.assets]).apply(([assets]) => {
        const uploadedObjects: aws.s3.BucketObject[] = [];

        // Define content headers
        const nonVersionedFilesTTL =
          typeof assets?.nonVersionedFilesTTL === "number"
            ? assets.nonVersionedFilesTTL
            : toSeconds(assets?.nonVersionedFilesTTL ?? "1 day");
        const staleWhileRevalidateTTL = Math.max(
          Math.floor(nonVersionedFilesTTL / 10),
          30,
        );
        const versionedFilesTTL =
          typeof assets?.versionedFilesTTL === "number"
            ? assets.versionedFilesTTL
            : toSeconds(assets?.versionedFilesTTL ?? "365 days");

        // Handle each S3 origin
        Object.values(plan.origins).forEach((origin) => {
          if (origin.type !== "s3") return;

          // Handle each copy source
          origin.copy.forEach(({ from, to, versionedSubDir }) => {
            // Build fileOptions
            const fileOptions: SsrSiteFileOptions[] = [
              // unversioned files
              {
                files: "**",
                ignore: versionedSubDir
                  ? path.posix.join(to, versionedSubDir, "**")
                  : undefined,
                cacheControl:
                  assets?.nonVersionedFilesCacheHeader ??
                  `public,max-age=0,s-maxage=${nonVersionedFilesTTL},stale-while-revalidate=${staleWhileRevalidateTTL}`,
              },
              // versioned files
              ...(versionedSubDir
                ? [
                    {
                      files: path.posix.join(to, versionedSubDir, "**"),
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
                cwd: from,
                nodir: true,
                dot: true,
                ignore: fileOption.ignore,
              }).filter((file) => !filesUploaded.includes(file));

              for (const file of files) {
                uploadedObjects.push(
                  new aws.s3.BucketObject(file, {
                    bucket: bucket.bucket,
                    source: new pulumi.asset.FileAsset(file),
                    contentType: getContentType(file, "UTF-8"),
                    cacheControl: fileOption.cacheControl,
                  }),
                );
              }
              filesUploaded.push(...files);
            }
          });
        });

        return uploadedObjects;
      });
    }

    function createCloudFrontFunctions() {
      const functions: Record<string, aws.cloudfront.Function> = {};

      Object.entries(plan.cloudFrontFunctions ?? {}).forEach(
        ([name, { injections }]) => {
          functions[name] = new aws.cloudfront.Function(name, {
            runtime: "cloudfront-js-1.0",
            code: pulumi.all([injections]).apply(
              ([injections]) => `
function handler(event) {
  var request = event.request;
  ${injections.join("\n")}
  return request;
}`,
            ),
          });
        },
      );
      return functions;
    }

    function createEdgeFunctions() {
      const functions: Record<string, Function> = {};

      Object.entries(plan.edgeFunctions ?? {}).forEach(
        ([name, { function: props }]) => {
          const fn = new Function(name, {
            runtime: "nodejs18.x",
            timeout: 20,
            memorySize: 1024,
            ...props,
            nodejs: {
              format: "esm" as const,
              ...props.nodejs,
            },
            environment: pulumi
              .all([args.environment])
              .apply(([environment]) => ({
                ...environment,
                ...props.environment,
              })),
            publish: true,
            region: "us-east-1",
            policies: pulumi.all([props.policies]).apply(([policies]) => [
              {
                name: "s3",
                policy: bucket.arn.apply((arn) =>
                  aws.iam
                    .getPolicyDocument({
                      statements: [
                        {
                          actions: ["s3:*"],
                          resources: [arn],
                        },
                      ],
                    })
                    .then((doc) => doc.json),
                ),
              },
              ...(policies || []),
            ]),
          });

          functions[name] = fn;
        },
      );
      return functions;
    }

    function buildOrigins() {
      const origins: Record<
        string,
        aws.types.input.cloudfront.DistributionOrigin
      > = {};

      Object.entries(plan.origins ?? {}).forEach(([name, props]) => {
        switch (props.type) {
          case "s3":
            origins[name] = buildS3Origin(name, props);
            break;
          case "function":
            origins[name] = buildFunctionOrigin(name, props);
            break;
          case "image-optimization-function":
            origins[name] = buildImageOptimizationFunctionOrigin(name, props);
            break;
        }
      });

      return origins;
    }

    function buildOriginGroups() {
      const originGroups: Record<
        string,
        aws.types.input.cloudfront.DistributionOriginGroup
      > = {};

      Object.entries(plan.origins ?? {}).forEach(([name, props]) => {
        if (props.type === "group") {
          originGroups[name] = {
            originId: name,
            failoverCriteria: {
              statusCodes: props.fallbackStatusCodes,
            },
            members: [
              { originId: props.primaryOriginName },
              { originId: props.fallbackOriginName },
            ],
          };
        }
      });

      return originGroups;
    }

    function buildS3Origin(name: string, props: S3OriginConfig) {
      return {
        originId: name,
        domainName: bucket.bucketRegionalDomainName,
        originPath: "/" + (props.originPath ?? ""),
        s3OriginConfig: {
          originAccessIdentity: access.cloudfrontAccessIdentityPath,
        },
      };
    }

    function buildFunctionOrigin(name: string, props: FunctionOriginConfig) {
      const fn = new Function(name, {
        runtime: "nodejs18.x",
        timeout: 20,
        memorySize: 1024,
        ...props.function,
        nodejs: {
          format: "esm" as const,
          ...props.function.nodejs,
        },
        environment: pulumi.all([args.environment]).apply(([environment]) => ({
          ...environment,
          ...props.function.environment,
        })),
        streaming: props.streaming,
        injections: pulumi
          .all([props.injections])
          .apply(([injections]) => [
            ...(args.warm ? [useServerFunctionWarmingInjection()] : []),
            ...(injections || []),
          ]),
        policies: [
          {
            name: "s3",
            policy: bucket.arn.apply((arn) =>
              aws.iam
                .getPolicyDocument({
                  statements: [
                    {
                      actions: ["s3:*"],
                      resources: [arn],
                    },
                  ],
                })
                .then((doc) => doc.json),
            ),
          },
        ],
      });
      ssrFunctions.push(fn);

      const url = new aws.lambda.FunctionUrl(`${name}-url`, {
        authorizationType: "NONE",
        functionName: fn.aws.function.name,
        invokeMode: props.streaming ? "RESPONSE_STREAM" : "BUFFERED",
      });

      return {
        originId: name,
        domainName: url.functionUrl.apply((url) => new URL(url).host),
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "https-only",
          originReadTimeout: 20,
          originSslProtocols: ["TLSv1.2"],
        },
      };
    }

    function buildImageOptimizationFunctionOrigin(
      name: string,
      props: ImageOptimizationFunctionOriginConfig,
    ) {
      const fn = new Function(name, {
        // TODO implement function log retention
        //logRetention: RetentionDays.THREE_DAYS,
        timeout: 25,
        policies: [
          {
            name: "s3",
            policy: bucket.arn.apply((arn) =>
              aws.iam
                .getPolicyDocument({
                  statements: [
                    {
                      actions: ["s3:GetObject"],
                      resources: [`${arn}/*`],
                    },
                  ],
                })
                .then((doc) => doc.json),
            ),
          },
        ],
        ...props.function,
      });

      const url = new aws.lambda.FunctionUrl(`${name}-url`, {
        authorizationType: "NONE",
        functionName: fn.aws.function.name,
      });

      return {
        originId: name,
        domainName: url.functionUrl.apply((url) => new URL(url).host),
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
          cachePolicyId: useServerBehaviorCachePolicy().id,
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
                  lambdaArn: edgeFunction.aws.function.qualifiedArn,
                },
              ]
            : [],
        };
      }

      throw new Error(`Invalid behavior type in the "${name}" site.`);
    }

    function useServerBehaviorCachePolicy() {
      singletonCachePolicy =
        singletonCachePolicy ??
        new aws.cloudfront.CachePolicy("cache-policy", {
          comment: "SST server response cache policy",
          defaultTtl: 0,
          maxTtl: 365,
          minTtl: 0,
          parametersInCacheKeyAndForwardedToOrigin: {
            cookiesConfig: {
              cookieBehavior: "none",
            },
            headersConfig: {
              headerBehavior: "whitelist",
              headers: {
                items: plan.cachePolicyAllowedHeaders || [],
              },
            },
            queryStringsConfig: {
              queryStringBehavior: "all",
            },
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
          },
        });
      return singletonCachePolicy;
    }

    function useServerFunctionWarmingInjection() {
      return `
if (event.type === "warmer") {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ serverId: "server-" + Math.random().toString(36).slice(2, 8) });
    }, event.delay);
  });
}`;
    }

    function createServerFunctionForDev() {
      //const role = new Role(self, "ServerFunctionRole", {
      //  assumedBy: new CompositePrincipal(
      //    new AccountPrincipal(app.account),
      //    new ServicePrincipal("lambda.amazonaws.com")
      //  ),
      //  maxSessionDuration: CdkDuration.hours(12),
      //});
      //return new SsrFunction(self, `ServerFunction`, {
      //  description: "Server handler placeholder",
      //  bundle: path.join(__dirname, "../support/ssr-site-function-stub"),
      //  handler: "index.handler",
      //  runtime,
      //  memorySize,
      //  timeout,
      //  role,
      //  bind,
      //  environment,
      //  permissions,
      //  // note: do not need to set vpc and layers settings b/c this function is not being used
      //});
    }

    function createCloudFrontDistribution() {
      return new Distribution(
        "distribution",
        {
          customDomain: args.customDomain,
          distribution: {
            origins: Object.values(origins),
            originGroups: Object.values(originGroups),
            defaultRootObject: "",
            defaultCacheBehavior: buildBehavior(
              plan.behaviors.find((behavior) => !behavior.pattern)!,
            ),
            orderedCacheBehaviors: plan.behaviors
              .filter((behavior) => behavior.pattern)
              .map((behavior) => ({
                pathPattern: behavior.pattern!,
                ...buildBehavior(behavior),
              })),
            customErrorResponses: [
              {
                errorCode: 404,
                responseCode: 200,
                responsePagePath: "/404.html",
              },
            ],
            enabled: true,
            restrictions: {
              geoRestriction: {
                restrictionType: "none",
              },
            },
            viewerCertificate: {
              cloudfrontDefaultCertificate: true,
            },
            waitForDeployment: false,
          },
        },
        // create distribution after s3 upload finishes
        { dependsOn: uploadedObjects },
      );
    }

    function allowServerFunctionInvalidateDistribution() {
      const policy = new aws.iam.Policy(`invalidation-policy`, {
        policy: pulumi.interpolate`{
            "Version": "2012-10-17",
            "Statement": [
              {
                "Action": "cloudfront:CreateInvalidation",
                "Effect": "Allow",
                "Resource": "${distribution.aws.distribution.arn}",
              }
            ]
          }`,
      });

      for (const fn of [...ssrFunctions, ...Object.values(edgeFunctions)]) {
        new aws.iam.RolePolicyAttachment(
          `invalidation-policy-${fn.aws.function.name}`,
          {
            policyArn: policy.arn,
            role: fn.aws.function.role,
          },
        );
      }
    }

    function createWarmer() {
      // note: Currently all sites have a single server function. When we add
      //       support for multiple server functions (ie. route splitting), we
      //       need to handle warming multiple functions.
      if (!args.warm) return;

      if (args.warm && plan.edge) {
        throw new Error(
          `In the "${name}" Site, warming is currently supported only for the regional mode.`,
        );
      }

      if (ssrFunctions.length === 0) return;

      // Create warmer function
      const warmer = new Function("warmer", {
        description: `${name} warmer`,
        bundle: path.join(__dirname, "../support/ssr-warmer"),
        runtime: "nodejs20.x",
        handler: "index.handler",
        timeout: 900,
        memorySize: 128,
        environment: {
          // TODO - SST design: output: how to reference the function inside Function
          //   looks weird to acces `function.function.name`
          FUNCTION_NAME: ssrFunctions[0].aws.function.name,
          CONCURRENCY: pulumi
            .all([args.warm])
            .apply(([warm]) => warm.toString()),
        },
        policies: [
          {
            name: "invoke-server",
            policy: ssrFunctions[0].aws.function.arn.apply((arn) =>
              aws.iam
                .getPolicyDocument({
                  statements: [
                    {
                      actions: ["lambda:InvokeFunction"],
                      resources: [arn],
                    },
                  ],
                })
                .then((doc) => doc.json),
            ),
          },
        ],
      });

      // Create cron job
      const schedule = new aws.cloudwatch.EventRule("warmer-rule", {
        description: `${name} warmer`,
        scheduleExpression: "rate(5 minutes)",
      });
      new aws.cloudwatch.EventTarget("warmer-target", {
        rule: schedule.name,
        arn: warmer.aws.function.arn,
        retryPolicy: {
          maximumRetryAttempts: 0,
        },
      });

      // Prewarm on deploy
      new aws.lambda.Invocation("warmer-prewarm", {
        functionName: warmer.aws.function.name,
        triggers: {
          version: Date.now().toString(),
        },
        input: JSON.stringify({}),
      });
    }

    function createDistributionInvalidation() {
      pulumi
        .all([outputPath, args.invalidation])
        .apply(([outputPath, invalidation]) => {
          // We will generate a hash based on the contents of the S3 files with cache enabled.
          // This will be used to determine if we need to invalidate our CloudFront cache.
          const s3Origin = Object.values(plan.origins).find(
            (origin) => origin.type === "s3",
          );
          if (s3Origin?.type !== "s3") return;
          const cachedS3Files = s3Origin.copy.filter((file) => file.cached);
          if (cachedS3Files.length === 0) return;

          // Build invalidation paths
          const invalidationPaths: string[] = [];
          if (invalidation?.paths === "none") {
          } else if (invalidation?.paths === "all") {
            invalidationPaths.push("/*");
          } else if (invalidation?.paths === "versioned") {
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
              if (invalidation?.paths !== "versioned") {
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
            console.debug(`Generated build ID ${invalidationBuildId}`);
          }

          new DistributionInvalidation("invalidation", {
            distributionId: distribution.aws.distribution.id,
            paths: invalidationPaths,
            wait: invalidation?.wait,
            version: invalidationBuildId,
          });
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
      };
      const extensionData = extensions[ext as keyof typeof extensions];
      const mime = extensionData?.mime ?? "application/octet-stream";
      const charset =
        extensionData?.isText && textEncoding !== "none"
          ? `;charset=${textEncoding}`
          : "";
      return `${mime}${charset}`;
    }
  });
}

export function useCloudFrontFunctionHostHeaderInjection() {
  return `request.headers["x-forwarded-host"] = request.headers.host;`;
}

export function validatePlan<
  CloudFrontFunctions extends Record<string, CloudFrontFunctionConfig>,
  EdgeFunctions extends Record<string, EdgeFunctionConfig>,
  Origins extends Record<
    string,
    | FunctionOriginConfig
    | ImageOptimizationFunctionOriginConfig
    | S3OriginConfig
    | OriginGroupConfig
  >,
>(input: {
  cloudFrontFunctions?: CloudFrontFunctions;
  edgeFunctions?: EdgeFunctions;
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
  // TODO - pulumi: use inferred types
  //errorResponses?: aws.cloudfront.DistributionArgs["customErrorResponses"];
  errorResponses?: {
    errorCode: number;
    responseCode?: number;
    responsePagePath?: string;
  };
  cachePolicyAllowedHeaders?: string[];
  buildId?: string;
  warmerConfig?: {
    function: string;
    schedule?: string;
  };
}) {
  return input;
}
