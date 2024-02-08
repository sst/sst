import path from "path";
import fs from "fs";
import { globSync } from "glob";
import crypto from "crypto";
import { execSync } from "child_process";
import {
  Output,
  Unwrap,
  output,
  all,
  interpolate,
  ComponentResource,
  ComponentResourceOptions,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Cdn, CdnDomainArgs } from "./cdn.js";
import { Function, FunctionArgs, FunctionPermissionArgs } from "./function.js";
import { Duration, toSeconds } from "./util/duration.js";
import { DistributionInvalidation } from "./providers/distribution-invalidation.js";
import { useProvider } from "./helpers/aws/provider.js";
import { Bucket } from "./bucket.js";
import { BucketFile, BucketFiles } from "./providers/bucket-files.js";
import { sanitizeToPascalCase } from "./helpers/naming.js";
import { Link } from "./link.js";
import type { Prettify, Transform } from "./component.js";
import type { Input } from "./input.js";

type CloudFrontFunctionConfig = { injections: string[] };
type EdgeFunctionConfig = { function: Unwrap<FunctionArgs> };
type FunctionOriginConfig = {
  type: "function";
  function: Unwrap<FunctionArgs>;
  injections?: string[];
  streaming?: boolean;
};
type ImageOptimizationFunctionOriginConfig = {
  type: "image-optimization-function";
  function: Unwrap<FunctionArgs>;
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
export interface SsrSiteFileOptions {
  files: string | string[];
  ignore?: string | string[];
  cacheControl?: string;
  contentType?: string;
}
export interface SsrSiteArgs {
  /**
   * Path to the directory where the app is located.
   * @default "."
   */
  path?: Input<string>;
  /**
   * Path relative to the app location where the type definitions are located.
   * @default "."
   */
  typesPath?: Input<string>;
  /**
   * The command for building the website
   * @default `npm run build`
   * @example
   * ```js
   * buildCommand: "yarn build",
   * ```
   */
  buildCommand?: Input<string>;
  /**
   * The domain for this website. SST supports domains that are hosted
   * either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js
   * domain: "domain.com",
   * ```
   *
   * ```js
   * domain: {
   *   domainName: "domain.com",
   *   redirects: ["www.domain.com"],
   *   hostedZone: "domain.com"
   * },
   * ```
   */
  domain?: Input<string | Prettify<CdnDomainArgs>>;
  /**
   * Attaches the given list of permissions to the SSR function.
   * @default No permissions
   * @example
   * ```js
   * permissions: [
   *   {
   *     actions: ["s3:*"],
   *     resources: ["arn:aws:s3:::*"],
   *   },
   * ]
   * ```
   */
  permissions?: Input<FunctionPermissionArgs[]>;
  /**
   * Link resources to the SSR function.
   * This will grant the site permissions to access the linked resources at runtime.
   *
   * @example
   * ```js
   * {
   *   link: [myBucket, stripeKey],
   * }
   * ```
   */
  link?: Input<any[]>;
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
  environment?: Input<Record<string, Input<string>>>;
  /**
   * The number of server functions to keep warm. This option is only supported for the regional mode.
   * @default Server function is not kept warm
   */
  warm?: Input<number>;
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
  assets?: Input<{
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
    textEncoding?: Input<
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
    versionedFilesTTL?: Input<number | Duration>;
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
    versionedFilesCacheHeader?: Input<string>;
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
    nonVersionedFilesTTL?: Input<number | Duration>;
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
    nonVersionedFilesCacheHeader?: Input<string>;
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
    fileOptions?: Input<Prettify<SsrSiteFileOptions>[]>;
  }>;
  invalidation?: Input<{
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
    wait?: Input<boolean>;
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
    paths?: Input<"none" | "all" | "versioned" | string[]>;
  }>;
  transform?: {
    plan?: Transform<Plan>;
  };
}

export function prepare(args: SsrSiteArgs, opts?: ComponentResourceOptions) {
  const sitePath = normalizeSitePath();
  const region = normalizeRegion();
  checkSupportedRegion();
  writeTypesFile();

  const doNotDeploy = output(false);
  //const doNotDeploy = app.mode === "dev" && !dev?.deploy;
  return { sitePath, doNotDeploy, region };

  function normalizeSitePath() {
    return output(args.path).apply((sitePath) => {
      if (!sitePath) return ".";

      if (!fs.existsSync(sitePath)) {
        throw new Error(`No site found at "${path.resolve(sitePath)}"`);
      }
      return sitePath;
    });
  }

  function normalizeRegion() {
    return all([
      $app.providers?.aws?.region!,
      (opts?.provider as aws.Provider)?.region,
    ]).apply(([appRegion, region]) => region ?? appRegion);
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
      throw new Error(
        `Region ${region} is not currently supported. Please use a different region.`,
      );
    });
  }

  function writeTypesFile() {
    return all([sitePath, args.typesPath]).apply(([sitePath, typesPath]) => {
      const filePath = path.resolve(sitePath, typesPath || ".", "sst-env.d.ts");

      // Do not override the types file if it already exists
      if (fs.existsSync(filePath)) return;

      const relPathToSstTypesFile = path.join(
        path.relative(path.dirname(filePath), $cli.paths.root),
        ".sst/types.generated.ts",
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
  sitePath: Output<string>,
  buildCommand?: Output<string>,
) {
  const defaultCommand = "npm run build";

  return all([sitePath, buildCommand, args.link, args.environment]).apply(
    ([sitePath, buildCommand, links, environment]) => {
      const cmd = buildCommand || defaultCommand;

      // Ensure that the site has a build script defined
      if (cmd === defaultCommand) {
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

      // TODO REMOVE
      if (process.env.SKIP) return output(sitePath);

      // Build link environment variables to inject
      const linkData = Link.build(links || []);
      const linkEnvs = output(linkData).apply((linkData) => {
        const envs: Record<string, string> = {};
        for (const datum of linkData) {
          envs[`SST_RESOURCE_${datum.name}`] = JSON.stringify(datum.value);
        }
        return envs;
      });

      // Run build
      return linkEnvs.apply((linkEnvs) => {
        console.debug(`Running "${cmd}" script`);
        try {
          execSync(cmd, {
            cwd: sitePath,
            stdio: "inherit",
            env: {
              SST: "1",
              ...process.env,
              ...environment,
              ...linkEnvs,
            },
          });
        } catch (e) {
          throw new Error(`There was a problem building the "${name}" site.`);
        }

        return sitePath;
      });
    },
  );
}

export function createBucket(parent: ComponentResource, name: string) {
  const access = createCloudFrontOriginAccessIdentity();
  const bucket = createS3Bucket();
  return { access, bucket };

  function createCloudFrontOriginAccessIdentity() {
    return new aws.cloudfront.OriginAccessIdentity(
      `${name}OriginAccessIdentity`,
      {},
      { parent },
    );
  }

  function createS3Bucket() {
    // TODO add "enforceSSL: true"
    const bucket = new Bucket(
      `${name}Assets`,
      {},
      { parent, retainOnDelete: false },
    );
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
          resources: [interpolate`${bucket.arn}/*`],
        },
      ],
    });
    new aws.s3.BucketPolicy(
      `${name}AssetsPolicy`,
      {
        bucket: bucket.name,
        policy: policyDocument.json,
      },
      { parent },
    );
    return bucket;
  }
}

export function createServersAndDistribution(
  parent: ComponentResource,
  name: string,
  args: SsrSiteArgs,
  outputPath: Output<string>,
  access: aws.cloudfront.OriginAccessIdentity,
  bucket: Bucket,
  plan: Input<Plan>,
) {
  return all([outputPath, plan]).apply(([outputPath, plan]) => {
    const ssrFunctions: Function[] = [];
    let singletonCachePolicy: aws.cloudfront.CachePolicy;

    const bucketFile = uploadAssets();
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
      return output(args.assets).apply(async (assets) => {
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

        const bucketFiles: BucketFile[] = [];

        // Handle each S3 origin
        for (const origin of Object.values(plan.origins)) {
          if (origin.type !== "s3") continue;

          // Handle each copy source
          for (const copy of origin.copy) {
            // Build fileOptions
            const fileOptions: SsrSiteFileOptions[] = [
              // unversioned files
              {
                files: "**",
                ignore: copy.versionedSubDir
                  ? path.posix.join(copy.versionedSubDir, "**")
                  : undefined,
                cacheControl:
                  assets?.nonVersionedFilesCacheHeader ??
                  `public,max-age=0,s-maxage=${nonVersionedFilesTTL},stale-while-revalidate=${staleWhileRevalidateTTL}`,
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
      const functions: Record<string, aws.cloudfront.Function> = {};

      Object.entries(plan.cloudFrontFunctions ?? {}).forEach(
        ([fnName, { injections }]) => {
          functions[fnName] = new aws.cloudfront.Function(
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
          const fn = new Function(
            `${name}Edge${sanitizeToPascalCase(fnName)}`,
            {
              runtime: "nodejs18.x",
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
                bucket,
                ...(props.link ?? []),
                ...(link ?? []),
              ]),
              transform: {
                function: (args) => ({ ...args, publish: true }),
              },
            },
            { provider: useProvider("us-east-1"), parent },
          );

          functions[fnName] = fn;
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
        domainName: bucket.nodes.bucket.bucketRegionalDomainName,
        originPath: props.originPath ? `/${props.originPath}` : "",
        s3OriginConfig: {
          originAccessIdentity: access.cloudfrontAccessIdentityPath,
        },
      };
    }

    function buildFunctionOrigin(fnName: string, props: FunctionOriginConfig) {
      const fn = new Function(
        `${name}${sanitizeToPascalCase(fnName)}`,
        {
          description: `${name} server`,
          runtime: "nodejs18.x",
          timeout: "20 seconds",
          memory: "1024 MB",
          ...props.function,
          nodejs: {
            format: "esm" as const,
            ...props.function.nodejs,
          },
          environment: output(args.environment).apply((environment) => ({
            ...environment,
            ...props.function.environment,
          })),
          streaming: props.streaming,
          injections: output(props.injections).apply((injections) => [
            ...(args.warm
              ? [useServerFunctionWarmingInjection(props.streaming)]
              : []),
            ...(injections || []),
          ]),
          link: output(args.link).apply((link) => [
            bucket,
            ...(props.function.link ?? []),
            ...(link ?? []),
          ]),
          url: true,
        },
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

    function buildImageOptimizationFunctionOrigin(
      fnName: string,
      props: ImageOptimizationFunctionOriginConfig,
    ) {
      const fn = new Function(
        `${name}${sanitizeToPascalCase(fnName)}`,
        {
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
        },
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
                  lambdaArn: edgeFunction.nodes.function.qualifiedArn,
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
        new aws.cloudfront.CachePolicy(
          `${name}ServerCachePolicy`,
          {
            comment: "SST server response cache policy",
            defaultTtl: 0,
            maxTtl: 365,
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

    function createServerFunctionForDev() {
      //const role = new Role(self, `${name}DevServerRole`, {
      //  assumedBy: new CompositePrincipal(
      //    new AccountPrincipal(app.account),
      //    new ServicePrincipal("lambda.amazonaws.com")
      //  ),
      //  maxSessionDuration: CdkDuration.hours(12),
      //}, {parent});
      //return new SsrFunction(self, `${name}DevServerFunction`, {
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
      //}, {parent});
    }

    function createCloudFrontDistribution() {
      return new Cdn(
        `${name}Cdn`,
        {
          domain: args.domain,
          transform: {
            distribution: (distribution) => ({
              ...distribution,
              comment: `${name} app`,
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
              waitForDeployment: !$dev,
            }),
          },
        },
        // create distribution after s3 upload finishes
        { dependsOn: bucketFile, parent },
      );
    }

    function allowServerFunctionInvalidateDistribution() {
      const policy = new aws.iam.Policy(
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

          new aws.iam.RolePolicyAttachment(
            `${name}InvalidationPolicyAttachment${uniqueHash}`,
            {
              policyArn: policy.arn,
              role: fn.nodes.role.name,
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
        throw new Error(
          `In the "${name}" Site, warming is currently supported only for the regional mode.`,
        );
      }

      if (ssrFunctions.length === 0) return;

      // Create warmer function
      const warmer = new Function(
        `${name}Warmer`,
        {
          description: `${name} warmer`,
          bundle: path.join($cli.paths.platform, "dist", "ssr-warmer"),
          runtime: "nodejs20.x",
          handler: "index.handler",
          timeout: "900 seconds",
          memory: "128 MB",
          environment: {
            FUNCTION_NAME: ssrFunctions[0].nodes.function.name,
            CONCURRENCY: output(args.warm).apply((warm) => warm.toString()),
          },
          link: [ssrFunctions[0]],
        },
        { parent },
      );

      // Create cron job
      const schedule = new aws.cloudwatch.EventRule(
        `${name}WarmerRule`,
        {
          description: `${name} warmer`,
          scheduleExpression: "rate(5 minutes)",
        },
        { parent },
      );
      new aws.cloudwatch.EventTarget(
        `${name}WarmerTarget`,
        {
          rule: schedule.name,
          arn: warmer.nodes.function.arn,
          retryPolicy: {
            maximumRetryAttempts: 0,
          },
        },
        { parent },
      );

      // Prewarm on deploy
      new aws.lambda.Invocation(
        `${name}Prewarm`,
        {
          functionName: warmer.nodes.function.name,
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
        ([outputPath, invalidation]) => {
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
          } else if (
            invalidation?.paths === "all" ||
            invalidation?.paths === undefined
          ) {
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

          new DistributionInvalidation(
            `${name}Invalidation`,
            {
              distributionId: distribution.nodes.distribution.id,
              paths: invalidationPaths,
              version: invalidationBuildId,
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
  errorResponses?: aws.types.input.cloudfront.DistributionCustomErrorResponse[];
  serverCachePolicy?: {
    allowedHeaders?: string[];
  };
  buildId?: string;
}) {
  return input;
}
