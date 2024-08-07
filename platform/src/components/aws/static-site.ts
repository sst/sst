import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  ComponentResourceOptions,
  Output,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Cdn, CdnArgs } from "./cdn.js";
import { Bucket, BucketArgs } from "./bucket.js";
import { Component, Transform, transform } from "../component.js";
import { Link } from "../link.js";
import { Input } from "../input.js";
import { globSync } from "glob";
import { BucketFile, BucketFiles } from "./providers/bucket-files.js";
import {
  BaseStaticSiteArgs,
  buildApp,
  cleanup,
  prepare,
} from "../base/base-static-site.js";
import { cloudfront, iam } from "@pulumi/aws";
import { URL_UNAVAILABLE } from "./linkable.js";
import { DevArgs } from "../dev.js";
import { OriginAccessControl } from "./providers/origin-access-control.js";
import { physicalName } from "../naming.js";

export interface StaticSiteArgs extends BaseStaticSiteArgs {
  /**
   * Configure how this component works in `sst dev`.
   *
   * :::note
   * In `sst dev` your static site is run in dev mode; it's not deployed.
   * :::
   *
   * Instead of deploying your static site, this starts it in dev mode. It's run
   * as a separate process in the `sst dev` multiplexer. Read more about
   * [`sst dev`](/docs/reference/cli/#dev).
   */
  dev?: DevArgs["dev"];
  /**
   * Path to the directory where your static site is located. By default this assumes your static site is in the root of your SST app.
   *
   * This directory will be uploaded to S3. The path is relative to your `sst.config.ts`.
   *
   * :::note
   * If the `build` options are specified, `build.output` will be uploaded to S3 instead.
   * :::
   *
   * If you are using a static site generator, like Vite, you'll need to configure the `build` options. When these are set, the `build.output` directory will be uploaded to S3 instead.
   *
   * @default `"."`
   *
   * @example
   *
   * Change where your static site is located.
   *
   * ```js
   * {
   *   path: "packages/web"
   * }
   * ```
   */
  path?: BaseStaticSiteArgs["path"];
  /**
   * Configure if your static site needs to be built. This is useful if you are using a static site generator.
   *
   * The `build.output` directory will be uploaded to S3 instead.
   * @example
   * For a Vite project using npm this might look like this.
   *
   * ```js
   * {
   *   build: {
   *     command: "npm run build",
   *     output: "dist"
   *   }
   * }
   * ```
   */
  build?: BaseStaticSiteArgs["build"];
  /**
   * Configure how the static site's assets are uploaded to S3.
   *
   * By default, this is set to the following. Read more about these options below.
   * ```js
   * {
   *   assets: {
   *     textEncoding: "utf-8",
   *     fileOptions: [
   *       {
   *         files: ["**\/*.css", "**\/*.js"],
   *         cacheControl: "max-age=31536000,public,immutable"
   *       },
   *       {
   *         files: "**\/*.html",
   *         cacheControl: "max-age=0,no-cache,no-store,must-revalidate"
   *       }
   *     ]
   *   }
   * }
   * ```
   * @default `Object`
   */
  assets?: BaseStaticSiteArgs["assets"];
  /**
   * Set a custom domain for your static site. Supports domains hosted either on
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
   * Specify a `www.` version of the custom domain.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  domain?: CdnArgs["domain"];
  /**
   * Configure how the CloudFront cache invalidations are handled. This is run after your static site has been deployed.
   * :::tip
   * You get 1000 free invalidations per month. After that you pay $0.005 per invalidation path. [Read more here](https://aws.amazon.com/cloudfront/pricing/).
   * :::
   * @default `{paths: "all", wait: false}`
   * @example
   * Turn off invalidations.
   * ```js
   * {
   *   invalidation: false
   * }
   * ```
   * Wait for all paths to be invalidated.
   * ```js
   * {
   *   invalidation: {
   *     paths: "all",
   *     wait: true
   *   }
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
         * You can either pass in an array of glob patterns to invalidate specific files. Or you can use the built-in option `all` to invalidation all files when any file changes.
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
        paths?: Input<"all" | string[]>;
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
    /**
     * Transform the CloudFront CDN resource.
     */
    cdn?: Transform<CdnArgs>;
  };
}

/**
 * The `StaticSite` component lets you deploy a static website to AWS. It uses [Amazon S3](https://aws.amazon.com/s3/) to store your files and [Amazon CloudFront](https://aws.amazon.com/cloudfront/) to serve them.
 *
 * It can also `build` your site by running your static site generator, like [Vite](https://vitejs.dev) and uploading the build output to S3.
 *
 * @example
 *
 * #### Minimal example
 *
 * Simply uploads the current directory as a static site.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Change the `path` that should be uploaded.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb", {
 *   path: "path/to/site"
 * });
 * ```
 *
 * #### Running locally
 *
 * In `sst dev`, we don't deploy your site to AWS because we assume you are running it locally.
 *
 * :::note
 * Your static site will not be deployed when run locally with `sst dev`.
 * :::
 *
 * For example, for a Vite site, you can run it locally with.
 *
 * ```bash
 * sst dev vite dev
 * ```
 *
 * This will start the Vite dev server and pass in any environment variables that you've set in your config. But it will not deploy your site to AWS.
 *
 * #### Deploy a Vite SPA
 *
 * Use [Vite](https://vitejs.dev) to deploy a React/Vue/Svelte/etc. SPA by specifying the `build` config.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb", {
 *   build: {
 *     command: "npm run build",
 *     output: "dist"
 *   }
 * });
 * ```
 *
 * #### Deploy a Jekyll site
 *
 * Use [Jekyll](https://jekyllrb.com) to deploy a static site.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb", {
 *   errorPage: "404.html",
 *   build: {
 *     command: "bundle exec jekyll build",
 *     output: "_site"
 *   }
 * });
 * ```
 *
 * #### Deploy a Gatsby site
 *
 * Use [Gatsby](https://www.gatsbyjs.com) to deploy a static site.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb", {
 *   errorPage: "404.html",
 *   build: {
 *     command: "npm run build",
 *     output: "public"
 *   }
 * });
 * ```
 *
 * #### Deploy an Angular SPA
 *
 * Use [Angular](https://angular.dev) to deploy a SPA.
 *
 * ```js title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb", {
 *   build: {
 *     command: "ng build --output-path dist",
 *     output: "dist"
 *   }
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your site.
 *
 * ```js {2} title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4} title="sst.config.ts"
 * new sst.aws.StaticSite("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Set environment variables
 *
 * Set `environment` variables for the build process of your static site. These will be used locally and on deploy.
 *
 * :::tip
 * For Vite, the types for the environment variables are also generated. This can be configured through the `vite` prop.
 * :::
 *
 * For some static site generators like Vite, [environment variables](https://vitejs.dev/guide/env-and-mode) prefixed with `VITE_` can be accessed in the browser.
 *
 * ```ts {5-7} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.StaticSite("MyWeb", {
 *   environment: {
 *     BUCKET_NAME: bucket.name,
 *     // Accessible in the browser
 *     VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_123"
 *   },
 *   build: {
 *     command: "npm run build",
 *     output: "dist"
 *   }
 * });
 * ```
 */
export class StaticSite extends Component implements Link.Linkable {
  private cdn?: Cdn;
  private assets?: Bucket;
  private devUrl?: Output<string>;

  constructor(
    name: string,
    args: StaticSiteArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;
    const { sitePath, environment, indexPage } = prepare(args);

    if ($dev) {
      this.devUrl = output(args.dev?.url ?? URL_UNAVAILABLE);
      this.registerOutputs({
        _metadata: {
          mode: "placeholder",
          path: sitePath,
          environment,
          url: this.url,
        },
        _receiver: all([sitePath, environment]).apply(
          ([sitePath, environment]) => ({
            directory: sitePath,
            links: [],
            environment,
          }),
        ),
        _dev: {
          environment: environment,
          command: output(args.dev?.command).apply(
            (val) => val || "npm run dev",
          ),
          directory: output(args.dev?.directory).apply(
            (dir) => dir || sitePath,
          ),
          autostart: output(args.dev?.autostart).apply((val) => val ?? true),
        },
      });
      return;
    }

    const outputPath = buildApp(name, args.build, sitePath, environment);
    const access = createCloudFrontOriginAccessControl();
    const bucket = createS3Bucket();
    const bucketFile = uploadAssets();
    const cloudfrontFunction = createCloudfrontFunction();
    const invalidation = buildInvalidation();
    const distribution = createDistribution();
    this.assets = bucket;
    this.cdn = distribution;

    this.registerOutputs({
      ...cleanup(sitePath, environment, this.url, args.dev),
      _metadata: {
        mode: "deployed",
        path: sitePath,
        environment,
        url: this.url,
      },
    });

    function createCloudFrontOriginAccessControl() {
      return new OriginAccessControl(
        `${name}S3AccessControl`,
        { name: physicalName(64, name) },
        { parent },
      );
    }

    function createCloudfrontFunction() {
      return new cloudfront.Function(
        `${name}Function`,
        {
          runtime: "cloudfront-js-1.0",
          code: `
    function handler(event) {
        var request = event.request;
        var uri = request.uri;
        if (uri.endsWith('/')) {
          request.uri += 'index.html';
        } else if (!uri.includes('.')) {
          request.uri += '.html';
        }
        return request;
    }`,
        },
        {
          parent,
        },
      );
    }

    function createS3Bucket() {
      return new Bucket(
        ...transform(
          args.transform?.assets,
          `${name}Assets`,
          {
            transform: {
              policy: (policyArgs) => {
                const newPolicy = iam.getPolicyDocumentOutput({
                  statements: [
                    {
                      principals: [
                        {
                          type: "Service",
                          identifiers: ["cloudfront.amazonaws.com"],
                        },
                      ],
                      actions: ["s3:GetObject"],
                      resources: [interpolate`${bucket.arn}/*`],
                    },
                  ],
                }).json;
                policyArgs.policy = output([
                  policyArgs.policy,
                  newPolicy,
                ]).apply(([policy, newPolicy]) => {
                  const policyJson = JSON.parse(policy as string);
                  const newPolicyJson = JSON.parse(newPolicy as string);
                  policyJson.Statement.push(...newPolicyJson.Statement);
                  return JSON.stringify(policyJson);
                });
              },
            },
          },
          { parent, retainOnDelete: false },
        ),
      );
    }

    function uploadAssets() {
      return all([outputPath, args.assets]).apply(
        async ([outputPath, assets]) => {
          const bucketFiles: BucketFile[] = [];

          // Build fileOptions
          const fileOptions = assets?.fileOptions ?? [
            {
              files: "**",
              cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
            },
            {
              files: ["**/*.js", "**/*.css"],
              cacheControl: "max-age=31536000,public,immutable",
            },
          ];

          // Upload files based on fileOptions
          const filesProcessed: string[] = [];
          for (const fileOption of fileOptions.reverse()) {
            const files = globSync(fileOption.files, {
              cwd: path.resolve(outputPath),
              nodir: true,
              dot: true,
              ignore: [
                ".sst/**",
                ...(typeof fileOption.ignore === "string"
                  ? [fileOption.ignore]
                  : fileOption.ignore ?? []),
              ],
            }).filter((file) => !filesProcessed.includes(file));

            bucketFiles.push(
              ...(await Promise.all(
                files.map(async (file) => {
                  const source = path.resolve(outputPath, file);
                  const content = await fs.promises.readFile(source);
                  const hash = crypto
                    .createHash("sha256")
                    .update(content)
                    .digest("hex");
                  return {
                    source,
                    key: file,
                    hash,
                    cacheControl: fileOption.cacheControl,
                    contentType: getContentType(file, "UTF-8"),
                  };
                }),
              )),
            );
            filesProcessed.push(...files);
          }

          return new BucketFiles(
            `${name}AssetFiles`,
            {
              bucketName: bucket.name,
              files: bucketFiles,
              purge: true,
            },
            { parent },
          );
        },
      );
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

    function createDistribution() {
      return new Cdn(
        ...transform(
          args.transform?.cdn,
          `${name}Cdn`,
          {
            comment: `${name} site`,
            origins: [
              {
                originId: "s3",
                domainName: bucket.nodes.bucket.bucketRegionalDomainName,
                originPath: "",
                originAccessControlId: access.id,
              },
            ],
            defaultRootObject: indexPage,
            customErrorResponses: args.errorPage
              ? [
                  {
                    errorCode: 403,
                    responsePagePath: interpolate`/${args.errorPage}`,
                    responseCode: 403,
                  },
                  {
                    errorCode: 404,
                    responsePagePath: interpolate`/${args.errorPage}`,
                    responseCode: 404,
                  },
                ]
              : [
                  {
                    errorCode: 403,
                    responsePagePath: interpolate`/${indexPage}`,
                    responseCode: 200,
                  },
                  {
                    errorCode: 404,
                    responsePagePath: interpolate`/${indexPage}`,
                    responseCode: 200,
                  },
                ],
            defaultCacheBehavior: {
              targetOriginId: "s3",
              viewerProtocolPolicy: "redirect-to-https",
              allowedMethods: ["GET", "HEAD", "OPTIONS"],
              cachedMethods: ["GET", "HEAD"],
              compress: true,
              // CloudFront's managed CachingOptimized policy
              cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
              functionAssociations: [
                {
                  eventType: "viewer-request",
                  functionArn: cloudfrontFunction.arn,
                },
              ],
            },
            domain: args.domain,
            invalidation,
            wait: !$dev,
          },
          // create distribution after s3 upload finishes
          { dependsOn: bucketFile, parent },
        ),
      );
    }

    function buildInvalidation() {
      return all([outputPath, args.invalidation]).apply(
        ([outputPath, invalidationRaw]) => {
          // Normalize invalidation
          if (invalidationRaw === false) return false;
          const invalidation = {
            wait: false,
            paths: "all" as const,
            ...invalidationRaw,
          };

          // Build invalidation paths
          const invalidationPaths =
            invalidation.paths === "all" ? ["/*"] : invalidation.paths;
          if (invalidationPaths.length === 0) return false;

          // Calculate a hash based on the contents of the S3 files. This will be
          // used to determine if we need to invalidate our CloudFront cache.
          //
          // The below options are needed to support following symlinks when building zip files:
          // - nodir: This will prevent symlinks themselves from being copied into the zip.
          // - follow: This will follow symlinks and copy the files within.
          const hash = crypto.createHash("md5");
          globSync("**", {
            dot: true,
            nodir: true,
            follow: true,
            cwd: path.resolve(outputPath),
          }).forEach((filePath) =>
            hash.update(fs.readFileSync(path.resolve(outputPath, filePath))),
          );

          return {
            paths: invalidationPaths,
            token: hash.digest("hex"),
            wait: invalidation.wait,
          };
        },
      );
    }
  }

  /**
   * The URL of the website.
   *
   * If the `domain` is set, this is the URL with the custom domain.
   * Otherwise, it's the autogenerated CloudFront URL.
   */
  public get url() {
    return all([this.cdn?.domainUrl, this.cdn?.url, this.devUrl]).apply(
      ([domainUrl, url, dev]) => domainUrl ?? url ?? dev!,
    );
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon S3 Bucket that stores the assets.
       */
      assets: this.assets,
      /**
       * The Amazon CloudFront CDN that serves the site.
       */
      cdn: this.cdn,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        url: this.url,
      },
    };
  }
}

const __pulumiType = "sst:aws:StaticSite";
// @ts-expect-error
StaticSite.__pulumiType = __pulumiType;
