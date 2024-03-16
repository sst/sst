import path from "path";
import url from "url";
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { Construct } from "constructs";
import { Token, RemovalPolicy, CustomResource } from "aws-cdk-lib/core";
import {
  BlockPublicAccess,
  Bucket,
  BucketProps,
  IBucket,
} from "aws-cdk-lib/aws-s3";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import {
  BehaviorOptions,
  IDistribution,
  Function as CfFunction,
  FunctionCode as CfFunctionCode,
  FunctionEventType as CfFunctionEventType,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Distribution, DistributionDomainProps } from "./Distribution.js";
import {
  BaseSiteFileOptions,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  getBuildCmdEnvironment,
  buildErrorResponsesFor404ErrorPage,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite.js";
import { useDeferredTasks } from "./deferred_task.js";
import { SSTConstruct, isCDKConstruct } from "./Construct.js";
import { BindingProps, getParameterPath } from "./util/binding.js";
import { gray } from "colorette";
import { useProject } from "../project.js";
import { createAppContext } from "./context.js";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { VisibleError } from "../error.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface StaticSiteProps {
  /**
   * Path to the directory where the website source is located.
   * @default "."
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   path: "path/to/src",
   * });
   * ```
   */
  path?: string;
  /**
   * The name of the index page (e.g. "index.html") of the website.
   * @default "index.html"
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   indexPage: "other-index.html",
   * });
   * ```
   */
  indexPage?: string;
  /**
   * The error page behavior for this website. Takes either an HTML page.
   * ```
   * 404.html
   * ```
   * Or the constant `"redirect_to_index_page"` to redirect to the index page.
   *
   * Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.
   * @default redirect_to_index_page
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   errorPage: "redirect_to_index_page",
   * });
   * ```
   */
  errorPage?: "redirect_to_index_page" | Omit<string, "redirect_to_index_page">;
  /**
   * The command for building the website
   * @default no build command
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   buildCommand: "npm run build",
   * });
   * ```
   */
  buildCommand?: string;
  /**
   * The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.
   * @default entire "path" directory
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   buildOutput: "build",
   * });
   * ```
   */
  buildOutput?: string;
  /**
   * Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:
   *
   * @example
   * ```js
   * new StaticSite(stack, "frontend", {
   *   replaceValues: [
   *     {
   *       files: "*.js",
   *       search: "{{ API_URL }}",
   *       replace: api.url,
   *     },
   *     {
   *       files: "*.js",
   *       search: "{{ COGNITO_USER_POOL_CLIENT_ID }}",
   *       replace: auth.cognitoUserPoolClient.userPoolClientId,
   *     },
   *   ],
   * });
   * ```
   */
  replaceValues?: StaticSiteReplaceProps[];
  /**
   * The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js
   * new StaticSite(stack, "frontend", {
   *   path: "path/to/src",
   *   customDomain: "domain.com",
   * });
   * ```
   *
   * @example
   * ```js
   * new StaticSite(stack, "frontend", {
   *   path: "path/to/src",
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *     hostedZone: "domain.com"
   *   }
   * });
   * ```
   */
  customDomain?: string | StaticSiteDomainProps;
  /**
   * An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.
   *
   * @example
   * ```js
   * new StaticSite(stack, "frontend", {
   *   environment: {
   *     REACT_APP_API_URL: api.url,
   *     REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   },
   * });
   * ```
   */
  environment?: Record<string, string>;
  /**
   * While deploying, SST removes old files that no longer exist. Pass in `false` to keep the old files around.
   *
   * @default true
   *
   * @example
   * ```js
   * new StaticSite(stack, "frontend", {
   *  purgeFiles: false
   * });
   * ```
   */
  purgeFiles?: boolean;
  assets?: {
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
    textEncoding?: "utf-8" | "iso-8859-1" | "windows-1252" | "ascii" | "none";
    /**
     * Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.
     * @default No cache control for HTML files, and a 1 year cache control for JS/CSS files.
     * ```js
     * assets: {
     *   fileOptions: [
     *     {
     *       files: "**",
     *       cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
     *     },
     *     {
     *       files: "**\/*.{js,css}",
     *       cacheControl: "max-age=31536000,public,immutable",
     *     },
     *   ],
     * }
     * ```
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
    fileOptions?: StaticSiteFileOptions[];
  };
  dev?: {
    /**
     * When running `sst dev, site is not deployed. This is to ensure `sst dev` can start up quickly.
     * @default false
     * @example
     * ```js
     * new StaticSite(stack, "frontend", {
     *  dev: {
     *    deploy: true
     *  }
     * });
     * ```
     */
    deploy?: boolean;
    /**
     * The local site URL when running `sst dev`.
     * @example
     * ```js
     * new StaticSite(stack, "frontend", {
     *  dev: {
     *    url: "http://localhost:3000"
     *  }
     * });
     * ```
     */
    url?: string;
  };
  vite?: {
    /**
     * The path where code-gen should place the type definition for environment variables
     * @default "src/sst-env.d.ts"
     * @example
     * ```js
     * new StaticSite(stack, "frontend", {
     *   vite: {
     *     types: "./other/path/sst-env.d.ts",
     *   }
     * });
     * ```
     */
    types?: string;
  };
  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   * @default false
   * @example
   * ```js
   * new StaticSite(stack, "frontend", {
   *  waitForInvalidation: true
   * });
   * ```
   */
  waitForInvalidation?: boolean;
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * Allows you to override default settings this construct uses internally to create the bucket
     *
     * @example
     * ```js
     * new StaticSite(stack, "Site", {
     *   path: "path/to/src",
     *   cdk: {
     *     bucket: {
     *       bucketName: "mybucket",
     *     },
     *   }
     * });
     * ```
     */
    bucket?: BucketProps | IBucket;
    /**
     * Configure the internally created CDK `Distribution` instance or provide an existing distribution
     *
     * @example
     * ```js
     * new StaticSite(stack, "Site", {
     *   path: "path/to/src",
     *   cdk: {
     *     distribution: {
     *       comment: "Distribution for my React website",
     *     },
     *   }
     * });
     * ```
     */
    distribution?: IDistribution | StaticSiteCdkDistributionProps;
  };
}

export interface StaticSiteDomainProps extends DistributionDomainProps {}
export interface StaticSiteFileOptions extends BaseSiteFileOptions {}
export interface StaticSiteReplaceProps extends BaseSiteReplaceProps {}
export interface StaticSiteCdkDistributionProps
  extends BaseSiteCdkDistributionProps {}

type StaticSiteNormalizedProps = StaticSiteProps & {
  path: Exclude<StaticSiteProps["path"], undefined>;
};

/**
 * The `StaticSite` construct is a higher level CDK construct that makes it easy to create a static website.
 *
 * @example
 *
 * Deploys a plain HTML website in the `path/to/src` directory.
 *
 * ```js
 * import { StaticSite } from "sst/constructs";
 *
 * new StaticSite(stack, "Site", {
 *   path: "path/to/src",
 * });
 * ```
 */
export class StaticSite extends Construct implements SSTConstruct {
  public readonly id: string;
  private props: StaticSiteNormalizedProps;
  private doNotDeploy: boolean;
  private bucket: Bucket;
  private distribution: Distribution;

  constructor(scope: Construct, id: string, props?: StaticSiteProps) {
    super(scope, props?.cdk?.id || id);

    const app = scope.node.root as App;
    const stack = Stack.of(this) as Stack;
    this.id = id;
    this.props = {
      path: ".",
      ...props,
    };

    this.doNotDeploy =
      !stack.isActive || (app.mode === "dev" && !this.props.dev?.deploy);

    this.validateDeprecatedFileOptions();
    this.generateViteTypes();
    useSites().add(stack.stackName, id, this.props);

    if (this.doNotDeploy) {
      // @ts-ignore
      this.bucket = this.distribution = null;
      app.registerTypes(this);
      return;
    }
    this.bucket = this.createS3Bucket();
    this.distribution = this.createCfDistribution();

    useDeferredTasks().add(async () => {
      // Build app
      this.buildApp();

      // Create S3 Deployment
      const assets = this.createS3Assets();
      const filenamesAsset = this.bundleFilenamesAsset();
      const s3deployCR = this.createS3Deployment(assets, filenamesAsset);
      this.distribution.node.addDependency(s3deployCR);

      // Invalidate CloudFront
      this.distribution.createInvalidation({
        version: this.generateInvalidationId(assets),
        wait: this.props.waitForInvalidation,
        dependsOn: [s3deployCR],
      });
    });

    app.registerTypes(this);
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    if (this.doNotDeploy) return this.props.dev?.url;

    return this.distribution.url;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the custom domain.
   */
  public get customDomainUrl() {
    if (this.doNotDeploy) return;

    const { customDomain } = this.props;
    if (!customDomain) return;

    if (typeof customDomain === "string") {
      return `https://${customDomain}`;
    } else {
      return `https://${customDomain.domainName}`;
    }
  }

  /**
   * The internally created CDK resources.
   */
  public get cdk() {
    if (this.doNotDeploy) return;

    return {
      bucket: this.bucket,
      distribution: this.distribution.cdk.distribution,
      hostedZone: this.distribution.cdk.hostedZone,
      certificate: this.distribution.cdk.certificate,
    };
  }

  public getConstructMetadata() {
    return {
      type: "StaticSite" as const,
      data: {
        path: this.props.path,
        environment: this.props.environment || {},
        customDomainUrl: this.customDomainUrl,
        url: this.url,
      },
    };
  }

  /** @internal */
  public getBindings(): BindingProps {
    const app = this.node.root as App;
    return {
      clientPackage: "site",
      variables: {
        url: this.doNotDeploy
          ? {
              type: "plain",
              value: this.props.dev?.url ?? "localhost",
            }
          : {
              // Do not set real value b/c we don't want to make the Lambda function
              // depend on the Site. B/c often the site depends on the Api, causing
              // a CloudFormation circular dependency if the Api and the Site belong
              // to different stacks.
              type: "site_url",
              value: this.customDomainUrl || this.url!,
            },
      },
      permissions: {
        "ssm:GetParameters": [
          `arn:${Stack.of(this).partition}:ssm:${app.region}:${
            app.account
          }:parameter${getParameterPath(this, "url")}`,
        ],
      },
    };
  }

  private validateDeprecatedFileOptions() {
    // @ts-expect-error
    if (this.props.fileOptions) {
      throw new VisibleError(
        `In the "${this.node.id}" construct, the "fileOptions" property has been replaced by "assets.fileOptions". More details on upgrading - https://docs.sst.dev/upgrade-guide#upgrade-to-v2310`
      );
    }
  }

  private generateViteTypes() {
    const { path: sitePath, environment } = this.props;

    // Build the path
    let typesPath = this.props.vite?.types;
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
${Object.keys(environment || {})
  .map((key) => `  readonly ${key}: string`)
  .join("\n")}
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}`;

    const fileDir = path.dirname(filePath);
    fs.mkdirSync(fileDir, { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  private buildApp() {
    const { path: sitePath, buildCommand } = this.props;

    // build
    if (buildCommand) {
      try {
        console.log(gray(`Building static site ${sitePath}`));
        execSync(buildCommand, {
          cwd: sitePath,
          stdio: "inherit",
          env: {
            ...process.env,
            ...getBuildCmdEnvironment(this.props.environment),
          },
        });
      } catch (e) {
        throw new Error(
          `There was a problem building the "${this.node.id}" StaticSite.`
        );
      }
    }

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(
        `No path found at "${path.resolve(sitePath)}" for the "${
          this.node.id
        }" StaticSite.`
      );
    }
  }

  private createS3Assets(): Asset[] {
    const { path: sitePath } = this.props;
    const buildOutput = this.props.buildOutput || ".";

    // validate buildOutput exists
    const siteOutputPath = path.resolve(path.join(sitePath, buildOutput));
    if (!fs.existsSync(siteOutputPath)) {
      throw new Error(
        `No build output found at "${siteOutputPath}" for the "${this.node.id}" StaticSite.`
      );
    }

    // clear zip path to ensure no partX.zip remain from previous build
    const zipPath = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `StaticSite-${this.node.id}-${this.node.addr}`
      )
    );
    fs.rmSync(zipPath, {
      force: true,
      recursive: true,
    });

    // create zip files
    const app = this.node.root as App;
    const script = path.join(__dirname, "../support/base-site-archiver.mjs");
    const fileSizeLimit = app.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
        this.props.sstTestFileSizeLimitOverride || 200
      : 200;
    const cmd = [
      "node",
      script,
      Buffer.from(JSON.stringify([{ src: siteOutputPath, tar: "" }])).toString(
        "base64"
      ),
      zipPath,
      fileSizeLimit,
    ].join(" ");

    try {
      execSync(cmd, {
        cwd: sitePath,
        stdio: "inherit",
      });
    } catch (e) {
      throw new Error(
        `There was a problem generating the "${this.node.id}" StaticSite package.`
      );
    }

    // create assets
    const assets = [];
    for (let partId = 0; ; partId++) {
      const zipFilePath = path.join(zipPath, `part${partId}.zip`);
      if (!fs.existsSync(zipFilePath)) {
        break;
      }

      assets.push(
        new Asset(this, `Asset${partId}`, {
          path: zipFilePath,
        })
      );
    }
    return assets;
  }

  private bundleFilenamesAsset(): Asset | undefined {
    if (this.props.purgeFiles === false) {
      return;
    }

    const zipPath = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `StaticSite-${this.node.id}-${this.node.addr}`
      )
    );

    // create assets
    const filenamesPath = path.join(zipPath, `filenames`);
    if (!fs.existsSync(filenamesPath)) {
      throw new Error(
        `There was a problem generating the "${this.node.id}" StaticSite package.`
      );
    }

    return new Asset(this, `AssetFilenames`, {
      path: filenamesPath,
    });
  }

  private createS3Bucket(): Bucket {
    const { cdk } = this.props;

    // cdk.bucket is an imported construct
    if (cdk?.bucket && isCDKConstruct(cdk?.bucket)) {
      return cdk.bucket as Bucket;
    }
    // cdk.bucket is a prop
    else {
      const bucketProps = cdk?.bucket as BucketProps;
      // Validate s3Bucket
      if (bucketProps?.websiteIndexDocument) {
        throw new Error(
          `Do not configure the "s3Bucket.websiteIndexDocument". Use the "indexPage" to configure the StaticSite index page.`
        );
      }

      if (bucketProps?.websiteErrorDocument) {
        throw new Error(
          `Do not configure the "s3Bucket.websiteErrorDocument". Use the "errorPage" to configure the StaticSite index page.`
        );
      }

      return new Bucket(this, "S3Bucket", {
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
        ...bucketProps,
      });
    }
  }

  private createS3Deployment(
    assets: Asset[],
    filenamesAsset?: Asset
  ): CustomResource {
    const stack = Stack.of(this) as Stack;
    const policy = new Policy(this, "S3UploaderPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [stack.customResourceHandler.functionArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:ListBucket", "s3:PutObject", "s3:DeleteObject"],
          resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`${assets[0].bucket.bucketArn}/*`],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);

    const resource = new CustomResource(this, "S3Uploader", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::S3Uploader",
      properties: {
        sources: assets.map((asset) => ({
          bucketName: asset.s3BucketName,
          objectKey: asset.s3ObjectKey,
        })),
        destinationBucketName: this.bucket.bucketName,
        filenames: filenamesAsset && {
          bucketName: filenamesAsset.s3BucketName,
          objectKey: filenamesAsset.s3ObjectKey,
        },
        textEncoding: this.props.assets?.textEncoding ?? "utf-8",
        fileOptions: [
          {
            files: "**",
            cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
          },
          {
            files: ["**/*.js", "**/*.css"],
            cacheControl: "max-age=31536000,public,immutable",
          },
          ...(this.props.assets?.fileOptions || []),
        ],
        replaceValues: this.getS3ContentReplaceValues(),
      },
    });
    resource.node.addDependency(policy);

    return resource;
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private createCfDistribution(): Distribution {
    const { errorPage, customDomain, cdk } = this.props;
    const indexPage = this.props.indexPage || "index.html";

    return new Distribution(this, "CDN", {
      scopeOverride: this,
      customDomain,
      cdk: {
        distribution:
          cdk?.distribution && isCDKConstruct(cdk.distribution)
            ? cdk.distribution
            : {
                // these values can be overwritten by cfDistributionProps
                defaultRootObject: indexPage,
                errorResponses:
                  !errorPage || errorPage === "redirect_to_index_page"
                    ? buildErrorResponsesForRedirectToIndex(indexPage)
                    : buildErrorResponsesFor404ErrorPage(errorPage as string),
                ...cdk?.distribution,
                // these values can NOT be overwritten by cfDistributionProps
                defaultBehavior: this.buildDistributionBehavior(),
              },
      },
    });
  }

  private generateInvalidationId(assets: Asset[]) {
    const stack = Stack.of(this) as Stack;

    // Need the AssetHash field so the CR gets updated on each deploy
    return crypto
      .createHash("md5")
      .update(assets.map(({ assetHash }) => assetHash).join(""))
      .digest("hex");
  }

  private buildDistributionBehavior(): BehaviorOptions {
    const { cdk } = this.props;
    return {
      origin: new S3Origin(this.bucket),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: [
        {
          // Note: this is required in Frameworks like Astro where `index.html`
          //       is required in the URL path.
          //       https://docs.astro.build/en/guides/deploy/aws/#cloudfront-functions-setup
          function: new CfFunction(this, "CloudFrontFunction", {
            code: CfFunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  if (uri.startsWith("/.well-known/")) {
    return request;
  }

  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (!uri.split("/").pop().includes(".")) {
    request.uri += ".html";
  }

  return request;
}
          `),
          }),
          eventType: CfFunctionEventType.VIEWER_REQUEST,
        },
      ],
      ...(cdk?.distribution as StaticSiteCdkDistributionProps)?.defaultBehavior,
    };
  }

  /////////////////////
  // Helper Functions
  /////////////////////

  private getS3ContentReplaceValues(): StaticSiteReplaceProps[] {
    const replaceValues: StaticSiteReplaceProps[] =
      this.props.replaceValues || [];

    Object.entries(this.props.environment || {})
      .filter(([, value]) => Token.isUnresolved(value))
      .forEach(([key, value]) => {
        const token = `{{ ${key} }}`;
        replaceValues.push(
          {
            files: "**/*.html",
            search: token,
            replace: value,
          },
          {
            files: "**/*.js",
            search: token,
            replace: value,
          }
        );
      });
    return replaceValues;
  }
}

export const useSites = createAppContext(() => {
  const sites: {
    stack: string;
    name: string;
    props: StaticSiteNormalizedProps;
  }[] = [];
  return {
    add(stack: string, name: string, props: StaticSiteNormalizedProps) {
      sites.push({ stack, name, props });
    },
    get all() {
      return sites;
    },
  };
});
