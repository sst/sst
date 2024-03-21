import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  ComponentResourceOptions,
  Output,
  all,
  asset,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Kv, KvArgs } from "./kv.js";
import { Component, Prettify, Transform, transform } from "../component.js";
import { Hint } from "../hint.js";
import { Link } from "../link.js";
import { Input } from "../input.js";
import { VisibleError } from "../error.js";
import { execSync } from "child_process";
import { globSync } from "glob";
import { KvDataEntry, KvData } from "./providers/kv-data.js";
import { Worker, WorkerArgs, WorkerDomainArgs } from "./worker.js";

interface FileOptions {
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

export interface StaticSiteArgs {
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
  path?: Input<string>;
  /**
   * The name of the index page of the site. This is a path relative to the root of your site, or the `path`.
   *
   * :::note
   * The index page only applies to the root of your site.
   * :::
   *
   * By default this is set to `index.html`. So if a visitor goes to your site, let's say `example.com`, `example.com/index.html` will be served.
   *
   * @default `"index.html"`
   * @example
   * ```js
   * {
   *   indexPage: "home.html"
   * }
   * ```
   */
  indexPage?: string;
  /**
   * The error page to display on a 403 or 404 error. This is a path relative to the root of your site, or the `path`.
   * @default The `indexPage` of your site.
   * @example
   * ```js
   * {
   *   errorPage: "404.html"
   * }
   * ```
   */
  errorPage?: Input<string>;
  /**
   * Set environment variables for your static site. These are made available:
   *
   * 1. Locally while running your site through `sst dev`.
   * 2. In the build process when running `build.command`.
   *
   * @example
   * ```js
   * environment: {
   *   API_URL: api.url
   *   STRIPE_PUBLISHABLE_KEY: "pk_test_123"
   * }
   * ```
   *
   * Some static site generators like Vite have their [concept of environment variables](https://vitejs.dev/guide/env-and-mode), and you can use this option to set them.
   *
   * :::note
   * The types for the Vite environment variables are generated automatically. You can change their location through `vite.types`.
   * :::
   *
   * These can be accessed as `import.meta.env` in your site. And only the ones prefixed with `VITE_` can be accessed in the browser.
   *
   * ```js
   * environment: {
   *   API_URL: api.url
   *   // Accessible in the browser
   *   VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_123"
   * }
   * ```
   */
  environment?: Input<Record<string, Input<string>>>;
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
  // TODO CHANGE 1 ABSTRACT IT OUT
  domain?: Input<Prettify<WorkerDomainArgs>>;
  /**
   * Configure if your static site needs to be built. This is useful if you are using a static site generator.
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
  build?: Input<{
    /**
     * The command that builds the static site. It's run before your site is deployed. This is run at the root of your site, `path`.
     * @example
     * ```js
     * {
     *   build: {
     *     command: "yarn build"
     *   }
     * }
     * ```
     */
    command: Input<string>;
    /**
     * The directory where the build output of your static site is generated. This will be uploaded to S3.
     *
     * The path is relative to the root of your site, `path`.
     * @example
     * ```js
     * {
     *   build: {
     *     output: "build"
     *   }
     * }
     * ```
     */
    output: Input<string>;
  }>;
  /**
   * Configure [Vite](https://vitejs.dev) related options.
   *
   * :::tip
   * If a `vite.config.ts` or `vite.config.js` file is detected in the `path`, then these options will be used during the build and deploy process.
   * :::
   */
  vite?: Input<{
    /**
     * The path where the type definition for the `environment` variables are generated. This is relative to the `path`. [Read more](https://vitejs.dev/guide/env-and-mode#intellisense-for-typescript).
     *
     * @default `"src/sst-env.d.ts"`
     * @example
     * ```js
     * {
     *   vite: {
     *     types: "other/path/sst-env.d.ts"
     *   }
     * }
     * ```
     */
    types?: string;
  }>;
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
     * Specify the `Content-Type` and `Cache-Control` headers for specific files. This allows
     * you to override the default behavior for specific files using glob patterns.
     *
     * :::tip
     * Behind the scenes, a combination of the `s3 cp` and `s3 sync` commands upload the assets to S3. An `s3 cp` command is run for each `fileOptions` block, and these options are passed in to the command.
     * :::
     *
     * By default, this is set to cache CSS/JS files for 1 year and not cache HTML files.
     *
     * ```js
     * {
     *   assets: {
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
     *
     * @default `Object[]`
     * @example
     * You can change the default options. For example, apply `Cache-Control` and `Content-Type` to all zip files.
     * ```js
     * {
     *   assets: {
     *     fileOptions: [
     *       {
     *         files: "**\/*.zip",
     *         contentType: "application/zip",
     *         cacheControl: "private,no-cache,no-store,must-revalidate"
     *       },
     *     ],
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
     *       },
     *     ],
     *   }
     * }
     * ```
     */
    fileOptions?: Input<Prettify<FileOptions>[]>;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Kv resource used for uploading the assets.
     */
    assets?: Transform<KvArgs>;
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
 * ```js
 * new sst.aws.StaticSite("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Change the `path` that should be uploaded.
 *
 * ```js
 * new sst.aws.StaticSite("MyWeb", {
 *   path: "path/to/site"
 * });
 * ```
 *
 * #### Deploy a Vite SPA
 *
 * Use [Vite](https://vitejs.dev) to deploy a React/Vue/Svelte/etc. SPA by specifying the `build` config.
 *
 * ```js
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
 * ```js
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
 * ```js
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
 * ```js
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
 * ```js {2}
 * new sst.aws.StaticSite("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4}
 * new sst.aws.StaticSite("MyWeb", {
 *   domain: {
 *     domainName: "my-app.com",
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
 * ```ts {5-7}
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
  private assets: Kv;
  private router: Worker;

  constructor(
    name: string,
    args: StaticSiteArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super("sst:cloudflare:StaticSite", name, args, opts);

    const parent = this;
    const sitePath = normalizeSitePath();
    const environment = normalizeEnvironment();
    const indexPage = normalizeIndexPage();
    generateViteTypes();
    const outputPath = buildApp();
    const storage = createStorage();

    // TODO CHANGED
    const assetManifest = generateAssetManifest();
    const kvData = uploadAssets();
    // TODO CHANGED
    const worker = createRouter();

    all([sitePath, environment]).apply(([sitepath, environment]) => {
      Link.Receiver.register(sitepath, [], environment);
    });

    this.assets = storage;
    this.router = worker;
    Hint.register(this.urn, worker.url as Output<string>);
    this.registerOutputs({
      _metadata: {
        path: sitePath,
        environment,
        url: worker.url,
      },
    });

    function normalizeSitePath() {
      return output(args.path).apply((sitePath) => {
        if (!sitePath) return ".";

        if (!fs.existsSync(sitePath)) {
          throw new VisibleError(
            `No site found at "${path.resolve(sitePath)}"`,
          );
        }
        return sitePath;
      });
    }

    function normalizeEnvironment() {
      return output(args.environment).apply((environment) => environment ?? {});
    }

    function normalizeIndexPage() {
      return output(args.indexPage).apply(
        (indexPage) => indexPage ?? "index.html",
      );
    }

    function createStorage() {
      return new Kv(`${name}Assets`, transform(args.transform?.assets, {}), {
        parent,
        retainOnDelete: false,
      });
    }

    function generateViteTypes() {
      return all([sitePath, args.vite, environment]).apply(
        ([sitePath, vite, environment]) => {
          // Build the path
          let typesPath = vite?.types;
          if (!typesPath) {
            if (
              fs.existsSync(path.join(sitePath, "vite.config.js")) ||
              fs.existsSync(path.join(sitePath, "vite.config.ts"))
            ) {
              typesPath = "src/sst-env.d.ts";
            }
          }
          if (!typesPath) {
            return;
          }

          // Create type file
          const filePath = path.resolve(path.join(sitePath, typesPath));
          const content = `/// <reference types="vite/client" />
  interface ImportMetaEnv {
  ${Object.keys(environment)
    .map((key) => `  readonly ${key}: string`)
    .join("\n")}
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }`;

          const fileDir = path.dirname(filePath);
          fs.mkdirSync(fileDir, { recursive: true });
          fs.writeFileSync(filePath, content);
        },
      );
    }

    function buildApp() {
      return all([sitePath, args.build, environment]).apply(
        ([sitePath, build, environment]) => {
          if ($dev)
            return path.join($cli.paths.platform, "functions", "empty-site");
          if (!build) return sitePath;

          // Run build
          if (!process.env.SKIP) {
            console.debug(`Running "${build.command}" script`);
            try {
              execSync(build.command, {
                cwd: sitePath,
                stdio: "inherit",
                env: {
                  ...process.env,
                  ...environment,
                },
              });
            } catch (e) {
              throw new VisibleError(
                `There was a problem building the "${name}" site.`,
              );
            }
          }

          // Validate build output
          if (!fs.existsSync(build.output)) {
            throw new VisibleError(
              `No build output found at "${path.resolve(build.output)}"`,
            );
          }

          return build.output;
        },
      );
    }

    function generateAssetManifest() {
      return all([outputPath, args.assets]).apply(
        async ([outputPath, assets]) => {
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
          const manifest = [];
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
            filesProcessed.push(...files);

            manifest.push(
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
          }

          return manifest;
        },
      );
    }

    function uploadAssets() {
      return new KvData(
        `${name}AssetFiles`,
        {
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
          namespaceId: storage.id,
          entries: assetManifest.apply((manifest) =>
            manifest.map((m) => ({
              source: m.source,
              key: m.key,
              hash: m.hash,
              cacheControl: m.cacheControl,
              contentType: m.contentType,
            })),
          ),
        },
        { parent, ignoreChanges: $dev ? ["*"] : undefined },
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

    function createRouter() {
      return new Worker(
        `${name}Router`,
        {
          handler: path.join(
            $cli.paths.platform,
            "functions",
            "cf-static-site-router-worker",
          ),
          url: true,
          domain: args.domain,
          environment: {
            INDEX_PAGE: indexPage,
            ...(args.errorPage ? { ERROR_PAGE: args.errorPage } : {}),
          },
          build: {
            banner: assetManifest.apply(
              (assetManifest) =>
                `const AssetManifest = ${JSON.stringify(
                  Object.fromEntries(assetManifest.map((e) => [e.key, e.hash])),
                )};`,
            ),
          },
          transform: {
            worker: (workerArgs) => {
              workerArgs.kvNamespaceBindings = [
                {
                  name: "ASSETS",
                  namespaceId: storage.id,
                },
              ];
            },
          },
        },
        // create distribution after s3 upload finishes
        { dependsOn: kvData, parent },
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
    return this.router.url;
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
