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
import { Function, FunctionArgs } from "./function.js";
import { DistributionInvalidation } from "./providers/distribution-invalidation.js";
import { useProvider } from "./helpers/provider.js";
import { Bucket, BucketArgs } from "./bucket.js";
import { BucketFile, BucketFiles } from "./providers/bucket-files.js";
import { sanitizeToPascalCase } from "../naming.js";
import { Link } from "../link.js";
import { Input } from "../input.js";
import { transform, type Prettify, type Transform } from "../component.js";
import { VisibleError } from "../error.js";
import { Cron } from "./cron.js";

type CloudFrontFunctionConfig = { injections: string[] };
type EdgeFunctionConfig = { function: Unwrap<FunctionArgs> };
type ServerOriginConfig = {
  function: Unwrap<FunctionArgs>;
  injections?: string[];
  streaming?: boolean;
};
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
export interface SsrSiteFileOptions {
  /**
   * A glob pattern or array of glob patterns of files to apply these options to.
   */
  files: string | string[];
  /**
   * A glob pattern or array of glob patterns of files to exclude from the ones matched
   * by the `files` glob pattern.
   */
  ignore?: string | string[];
  /**
   * The `Cache-Control` header to apply to the matched files.
   */
  cacheControl?: string;
  /**
   * The `Content-Type` header to apply to the matched files.
   */
  contentType?: string;
}
export interface SsrSiteArgs {
  /**
   * Path to the directory where the app is located.
   * @default `"."`
   */
  path?: Input<string>;
  /**
   * The command for building the website
   * @default `npm run build`
   * @example
   * ```js
   * {
   *   buildCommand: "yarn build"
   * }
   * ```
   */
  buildCommand?: Input<string>;
  /**
   * Set a custom domain for your SSR site. Supports domains hosted either on
   * [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   *
   * :::tip
   * You can also migrate an externally hosted domain to Amazon Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   * :::
   *
   * @example
   *
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   *
   * Specify the Route 53 hosted zone and a `www.` version of the custom domain.
   *
   * ```js
   * {
   *   domain: {
   *     domainName: "domain.com",
   *     hostedZone: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  domain?: Input<string | Prettify<CdnDomainArgs>>;
  /**
   * Permissions and the resources that the function needs to access. These permissions are
   * used to create the function's IAM role.
   *
   * :::tip
   * If you `link` the function to a resource, the permissions to access it are
   * automatically added.
   * :::
   *
   * @example
   * Allow the function to read and write to an S3 bucket called `my-bucket`.
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["s3:GetObject", "s3:PutObject"],
   *       resources: ["arn:aws:s3:::my-bucket/*"]
   *     },
   *   ]
   * }
   * ```
   *
   * Allow the function to perform all actions on an S3 bucket called `my-bucket`.
   *
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["s3:*"],
   *       resources: ["arn:aws:s3:::my-bucket/*"]
   *     },
   *   ]
   * }
   * ```
   *
   * Granting the function permissions to access all resources.
   *
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["*"],
   *       resources: ["*"]
   *     },
   *   ]
   * }
   * ```
   */
  permissions?: FunctionArgs["permissions"];
  /**
   * [Link resources](/docs/linking/) to your site. This will:
   *
   * 1. Grant the permissions needed to access the resources.
   * 2. Allow you to access it in your site using the [SDK](/docs/reference/sdk/).
   *
   * @example
   *
   * Takes a list of components to link to the function.
   *
   * ```js
   * {
   *   link: [myBucket, stripeKey]
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
  /**
   * Configure how the assets uploaded to S3.
   */
  assets?: Input<{
    /**
     * Character encoding for text based assets uploaded to S3, like HTML, CSS, JS. This is
     * used to set the `Content-Type` header when these files are served out.
     *
     * If set to `"none"`, then no charset will be returned in header.
     * @default `"utf-8"`
     * @example
     * ```js
     * {
     *   assets: {
     *     textEncoding: "iso-8859-1"
     *   }
     * }
     * ```
     */
    textEncoding?: Input<
      "utf-8" | "iso-8859-1" | "windows-1252" | "ascii" | "none"
    >;
    /**
     * The `Cache-Control` header used for versioned files, like `main-1234.css`. This is
     * used by both CloudFront and the browser cache.
     *
     * The default `max-age` is set to 1 year.
     * @default `"public,max-age=31536000,immutable"`
     * @example
     * ```js
     * {
     *   assets: {
     *     versionedFilesCacheHeader: "public,max-age=31536000,immutable"
     *   }
     * }
     * ```
     */
    versionedFilesCacheHeader?: Input<string>;
    /**
     * The `Cache-Control` header used for non-versioned files, like `index.html`. This is
     * used by both CloudFront and the browser cache.
     *
     * The default is set not cache on browsers, and cache for 1 day on CloudFront.
     * @default `"public,max-age=0,s-maxage=86400,stale-while-revalidate=8640"`
     * @example
     * ```js
     * {
     *   assets: {
     *     nonVersionedFilesCacheHeader: "public,max-age=0,no-cache"
     *   }
     * }
     * ```
     */
    nonVersionedFilesCacheHeader?: Input<string>;
    /**
     * Specify the `Content-Type` and `Cache-Control` headers for specific files. This allows
     * you to override the default behavior for specific files using glob patterns.
     *
     * :::tip
     * Behind the scenes, a combination of the `s3 cp` and `s3 sync` commands upload the assets to S3. An `s3 cp` command is run for each `fileOptions` block, and these options are passed in to the command.
     * :::
     *
     * @example
     * Apply `Cache-Control` and `Content-Type` to all zip files.
     * ```js
     * {
     *   assets: {
     *     fileOptions: [
     *       {
     *         files: "**\/*.zip",
     *         contentType: "application/zip",
     *         cacheControl: "private,no-cache,no-store,must-revalidate"
     *       }
     *     ]
     *   }
     * }
     * ```
     * Apply `Cache-Control` to all CSS and JS files except for CSS files with `index-`
     * prefix in the `main/` directory.
     * ```js
     * {
     *   assets: {
     *     fileOptions: [
     *       {
     *         files: ["**\/*.css", "**\/*.js"],
     *         ignore: "main\/index-*.css",
     *         cacheControl: "private,no-cache,no-store,must-revalidate"
     *       }
     *     ]
     *   }
     * }
     * ```
     */
    fileOptions?: Input<Prettify<SsrSiteFileOptions>[]>;
  }>;
  /**
   * Configure how the CloudFront cache invalidations are handled.
   * @default `&lcub;wait: false, paths: "all"&rcub;`
   * @example
   * Disable invalidation.
   * ```js
   * {
   *   invalidation: false
   * }
   * ```
   */
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
         * Waiting for the CloudFront cache invalidation process to finish ensures that the new content will be served once the deploy finishes. However, this process can sometimes take more than 5 mins.
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
         * - `all`: All files will be invalidated when any file changes.
         * - `versioned`: Only versioned files will be invalidated when versioned files change.
         *
         * :::note
         * Invalidating `all` counts as one invalidation, while each glob pattern counts as a single invalidation path.
         * :::
         * @default `"all"`
         * @example
         * Invalidate the `index.html` and all files under the `products/` route.
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
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Bucket resource used for uploading the assets.
     */
    assets?: Transform<BucketArgs>;
  };
}

export function prepare(args: SsrSiteArgs, opts: ComponentResourceOptions) {
  const sitePath = normalizeSitePath();
  const region = normalizeRegion();
  checkSupportedRegion();

  return {
    sitePath,
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

  function normalizeRegion() {
    return aws.getRegionOutput(undefined, { provider: opts?.provider }).name;
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
          throw new VisibleError(`No package.json found at "${sitePath}".`);
        }
        const packageJson = JSON.parse(
          fs.readFileSync(path.join(sitePath, "package.json")).toString(),
        );
        if (!packageJson.scripts || !packageJson.scripts.build) {
          throw new VisibleError(
            `No "build" script found within package.json in "${sitePath}".`,
          );
        }
      }

      if (process.env.SKIP) return output(sitePath);
      if ($dev) return output(sitePath);

      // Build link environment variables to inject
      const linkData = Link.build(links || []);
      const linkEnvs = output(linkData).apply((linkData) => {
        const envs: Record<string, string> = {};
        for (const datum of linkData) {
          envs[`SST_RESOURCE_${datum.name}`] = JSON.stringify(datum.properties);
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
              ...process.env,
              ...environment,
              ...linkEnvs,
            },
          });
        } catch (e) {
          throw new VisibleError(
            `There was a problem building the "${name}" site.`,
          );
        }

        return sitePath;
      });
    },
  );
}

export function createBucket(
  parent: ComponentResource,
  name: string,
  args: SsrSiteArgs,
) {
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
    return new Bucket(
      `${name}Assets`,
      transform(args.transform?.assets, {
        transform: {
          policy: (policyArgs) => {
            const newPolicy = aws.iam.getPolicyDocumentOutput({
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
            const fileOptions: SsrSiteFileOptions[] = [
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
          { parent, ignoreChanges: $dev ? ["*"] : undefined },
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
                function: (args) => ({ ...args, publish: true }),
              },
              liveDev: false,
              _ignoreCodeChanges: $dev,
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
        aws.types.input.cloudfront.DistributionOriginGroup
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
          originAccessIdentity: access.cloudfrontAccessIdentityPath,
        },
      };
    }

    function buildServerOrigin(fnName: string, props: ServerOriginConfig) {
      const fn = new Function(
        `${name}${sanitizeToPascalCase(fnName)}`,
        {
          description: `${name} server`,
          runtime: "nodejs20.x",
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
            ...(props.function.link ?? []),
            ...(link ?? []),
          ]),
          url: true,
          liveDev: false,
          _ignoreCodeChanges: $dev,
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

    function buildImageOptimizationOrigin(
      fnName: string,
      props: ImageOptimizationOriginConfig,
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
          liveDev: false,
          _ignoreCodeChanges: $dev,
          _skipMetadata: true,
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

      throw new VisibleError(`Invalid behavior type in the "${name}" site.`);
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

    function createDistribution() {
      return new Cdn(
        `${name}Cdn`,
        {
          domain: args.domain,
          wait: !$dev,
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
              customErrorResponses: plan.errorResponses,
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
            liveDev: false,
            environment: {
              FUNCTION_NAME: ssrFunctions[0].nodes.function.name,
              CONCURRENCY: output(args.warm).apply((warm) => warm.toString()),
            },
            link: [ssrFunctions[0]],
            _skipMetadata: true,
          },
          transform: {
            target: (targetArgs) => {
              targetArgs.retryPolicy = {
                maximumRetryAttempts: 0,
                maximumEventAgeInSeconds: 60,
              };
            },
          },
        },
        { parent },
      );

      // Prewarm on deploy
      new aws.lambda.Invocation(
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
            {
              parent,
              ignoreChanges: $dev ? ["*"] : undefined,
            },
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
  errorResponses?: aws.types.input.cloudfront.DistributionCustomErrorResponse[];
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
