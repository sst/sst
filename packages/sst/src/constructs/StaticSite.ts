import path from "path";
import url from "url";
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { Construct } from "constructs";
import {
  Token,
  Duration,
  RemovalPolicy,
  CustomResource,
} from "aws-cdk-lib/core";
import {
  BlockPublicAccess,
  Bucket,
  BucketProps,
  IBucket,
} from "aws-cdk-lib/aws-s3";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import {
  HostedZone,
  IHostedZone,
  ARecord,
  AaaaRecord,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import {
  BehaviorOptions,
  Distribution,
  IDistribution,
  Function as CfFunction,
  FunctionCode as CfFunctionCode,
  FunctionEventType as CfFunctionEventType,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import {
  BaseSiteDomainProps,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  getBuildCmdEnvironment,
  buildErrorResponsesFor404ErrorPage,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite.js";
import { HttpsRedirect } from "./cdk/website-redirect.js";
import { DnsValidatedCertificate } from "./cdk/dns-validated-certificate.js";
import { SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  FunctionBindingProps,
  getParameterPath,
} from "./util/functionBinding.js";
import { gray } from "colorette";
import { useProject } from "../project.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface StaticSiteFileOptions {
  exclude: string | string[];
  include: string | string[];
  cacheControl: string;
}

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
   * Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.
   *
   * Defaults to no cache control for HTML files, and a 1 year cache control for JS/CSS files.
   * ```js
   * [
   *   {
   *     exclude: "*",
   *     include: "*.html",
   *     cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
   *   },
   *   {
   *     exclude: "*",
   *     include: ["*.js", "*.css"],
   *     cacheControl: "max-age=31536000,public,immutable",
   *   },
   * ]
   * ```
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   buildOutput: "dist",
   *   fileOptions: [{
   *     exclude: "*",
   *     include: "*.js",
   *     cacheControl: "max-age=31536000,public,immutable",
   *   }]
   * });
   * ```
   */
  fileOptions?: StaticSiteFileOptions[];
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
   *  purge: false
   * });
   * ```
   */
  purgeFiles?: boolean;
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

export interface StaticSiteDomainProps extends BaseSiteDomainProps {}
export interface StaticSiteReplaceProps extends BaseSiteReplaceProps {}
export interface StaticSiteCdkDistributionProps
  extends BaseSiteCdkDistributionProps {}

/////////////////////
// Construct
/////////////////////

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
  private props: Omit<StaticSiteProps, "path"> & { path: string };
  private doNotDeploy: boolean;
  private bucket: Bucket;
  private distribution: Distribution;
  private hostedZone?: IHostedZone;
  private certificate?: ICertificate;

  constructor(scope: Construct, id: string, props?: StaticSiteProps) {
    super(scope, props?.cdk?.id || id);

    const app = scope.node.root as App;
    const stack = Stack.of(this) as Stack;
    this.id = id;
    this.props = {
      path: ".",
      waitForInvalidation: false,
      ...props,
    };

    this.doNotDeploy =
      !stack.isActive || (app.mode === "dev" && !this.props.dev?.deploy);

    this.validateCustomDomainSettings();
    this.generateViteTypes();

    if (this.doNotDeploy) {
      // @ts-ignore
      this.bucket = this.distribution = null;
      return;
    }

    const cliLayer = new AwsCliLayer(this, "AwsCliLayer");

    // Build app
    const fileSizeLimit = app.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
        this.props.sstTestFileSizeLimitOverride || 200
      : 200;
    this.buildApp();
    const assets = this.bundleAssets(fileSizeLimit);
    const filenamesAsset = this.bundleFilenamesAsset();

    // Create Bucket
    this.bucket = this.createS3Bucket();

    // Create Custom Domain
    this.hostedZone = this.lookupHostedZone();
    this.certificate = this.createCertificate();

    // Create S3 Deployment
    const s3deployCR = this.createS3Deployment(
      cliLayer,
      assets,
      filenamesAsset
    );

    // Create CloudFront
    this.distribution = this.createCfDistribution();
    this.distribution.node.addDependency(s3deployCR);

    // Invalidate CloudFront
    const invalidationCR = this.createCloudFrontInvalidation(assets);
    invalidationCR.node.addDependency(this.distribution);

    // Connect Custom Domain to CloudFront Distribution
    this.createRoute53Records();
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    if (this.doNotDeploy) return this.props.dev?.url;

    return `https://${this.distribution.distributionDomainName}`;
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
      distribution: this.distribution,
      hostedZone: this.hostedZone,
      certificate: this.certificate,
    };
  }

  public getConstructMetadata() {
    return {
      type: "StaticSite" as const,
      data: {
        path: this.props.path,
        environment: this.props.environment || {},
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
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

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(
        `No path found at "${path.resolve(sitePath)}" for the "${
          this.node.id
        }" StaticSite.`
      );
    }

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
  }

  private bundleAssets(fileSizeLimit: number): Asset[] {
    const { path: sitePath } = this.props;
    const buildOutput = this.props.buildOutput || ".";

    // validate buildOutput exists
    const siteOutputPath = path.resolve(path.join(sitePath, buildOutput));
    if (!fs.existsSync(siteOutputPath)) {
      throw new Error(
        `No build output found at "${siteOutputPath}" for the "${this.node.id}" StaticSite.`
      );
    }

    // create zip files
    const script = path.join(__dirname, "../support/base-site-archiver.mjs");
    const zipPath = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `StaticSite-${this.node.id}-${this.node.addr}`
      )
    );
    // clear zip path to ensure no partX.zip remain from previous build
    fs.rmSync(zipPath, {
      force: true,
      recursive: true,
    });
    const cmd = ["node", script, siteOutputPath, zipPath, fileSizeLimit].join(
      " "
    );

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
    cliLayer: AwsCliLayer,
    assets: Asset[],
    filenamesAsset?: Asset
  ): CustomResource {
    const fileOptions = this.props.fileOptions || [
      {
        exclude: "*",
        include: "*.html",
        cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
      },
      {
        exclude: "*",
        include: ["*.js", "*.css"],
        cacheControl: "max-age=31536000,public,immutable",
      },
    ];

    // Create a Lambda function that will be doing the uploading
    const uploader = new Function(this, "S3Uploader", {
      code: Code.fromAsset(
        path.join(__dirname, "../support/base-site-custom-resource")
      ),
      layers: [cliLayer],
      runtime: Runtime.PYTHON_3_7,
      handler: "s3-upload.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
    });
    this.bucket.grantReadWrite(uploader);
    assets.forEach((asset) => asset.grantRead(uploader));

    // Create the custom resource function
    const handler = new Function(this, "S3Handler", {
      code: Code.fromAsset(
        path.join(__dirname, "../support/base-site-custom-resource")
      ),
      layers: [cliLayer],
      runtime: Runtime.PYTHON_3_7,
      handler: "s3-handler.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
      environment: {
        UPLOADER_FUNCTION_NAME: uploader.functionName,
      },
    });
    this.bucket.grantReadWrite(handler);
    filenamesAsset?.grantRead(handler);
    uploader.grantInvoke(handler);

    // Create custom resource
    return new CustomResource(this, "S3Deployment", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        Sources: assets.map((asset) => ({
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        })),
        DestinationBucketName: this.bucket.bucketName,
        Filenames: filenamesAsset && {
          BucketName: filenamesAsset.s3BucketName,
          ObjectKey: filenamesAsset.s3ObjectKey,
        },
        FileOptions: (fileOptions || []).map(
          ({ exclude, include, cacheControl }) => {
            if (typeof exclude === "string") {
              exclude = [exclude];
            }
            if (typeof include === "string") {
              include = [include];
            }
            const options = [];
            exclude.forEach((per) => options.push("--exclude", per));
            include.forEach((per) => options.push("--include", per));
            options.push("--cache-control", cacheControl);
            return options;
          }
        ),
        ReplaceValues: this.getS3ContentReplaceValues(),
      },
    });
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private createCfDistribution(): Distribution {
    const { cdk, errorPage } = this.props;

    const isImportedCloudFrontDistribution = (
      distribution?: IDistribution | StaticSiteCdkDistributionProps
    ): distribution is IDistribution => {
      return distribution !== undefined && isCDKConstruct(distribution);
    };

    // cdk.distribution is an imported construct
    if (isImportedCloudFrontDistribution(cdk?.distribution)) {
      return cdk?.distribution as Distribution;
    }

    // Validate input
    if (cdk?.distribution?.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the domain certificate.`
      );
    }
    if (cdk?.distribution?.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the domain name.`
      );
    }
    if (errorPage && cdk?.distribution?.errorResponses) {
      throw new Error(
        `Cannot configure the "cfDistribution.errorResponses" when "errorPage" is passed in. Use one or the other to configure the behavior for error pages.`
      );
    }

    // Create CloudFront distribution
    const indexPage = this.props.indexPage || "index.html";
    return new Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: indexPage,
      errorResponses:
        !errorPage || errorPage === "redirect_to_index_page"
          ? buildErrorResponsesForRedirectToIndex(indexPage)
          : buildErrorResponsesFor404ErrorPage(errorPage as string),
      ...cdk?.distribution,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.certificate,
      defaultBehavior: this.buildDistributionBehavior(),
    });
  }

  private createCloudFrontInvalidation(assets: Asset[]): CustomResource {
    const stack = Stack.of(this) as Stack;

    // Need the AssetHash field so the CR gets updated on each deploy
    const assetsHash = crypto
      .createHash("md5")
      .update(assets.map(({ assetHash }) => assetHash).join(""))
      .digest("hex");

    const policy = new Policy(this, "CloudFrontInvalidatorPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "cloudfront:GetInvalidation",
            "cloudfront:CreateInvalidation",
          ],
          resources: [
            `arn:${stack.partition}:cloudfront::${stack.account}:distribution/${this.distribution.distributionId}`,
          ],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);

    const resource = new CustomResource(this, "CloudFrontInvalidator", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::CloudFrontInvalidator",
      properties: {
        assetsHash,
        distributionId: this.distribution.distributionId,
        paths: ["/*"],
        waitForInvalidation: this.props.waitForInvalidation,
      },
    });
    resource.node.addDependency(policy);

    return resource;
  }

  protected buildDistributionDomainNames(): string[] {
    const { customDomain } = this.props;
    const domainNames = [];
    if (!customDomain) {
      // no domain
    } else if (typeof customDomain === "string") {
      domainNames.push(customDomain);
    } else {
      domainNames.push(customDomain.domainName);
      if (customDomain.alternateNames) {
        if (!customDomain.cdk?.certificate)
          throw new Error(
            "Certificates for alternate domains cannot be automatically created. Please specify certificate to use"
          );
        domainNames.push(...customDomain.alternateNames);
      }
    }
    return domainNames;
  }

  private buildDistributionBehavior(): BehaviorOptions {
    const { cdk } = this.props;
    return {
      origin: new S3Origin(this.bucket),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: [
        {
          function: new CfFunction(this, "CloudFrontFunction", {
            code: CfFunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
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
  // Custom Domain
  /////////////////////

  protected validateCustomDomainSettings() {
    const { customDomain } = this.props;

    if (!customDomain) {
      return;
    }

    if (typeof customDomain === "string") {
      return;
    }

    if (customDomain.isExternalDomain === true) {
      if (!customDomain.cdk?.certificate) {
        throw new Error(
          `A valid certificate is required when "isExternalDomain" is set to "true".`
        );
      }
      if (customDomain.domainAlias) {
        throw new Error(
          `Domain alias is only supported for domains hosted on Amazon Route 53. Do not set the "customDomain.domainAlias" when "isExternalDomain" is enabled.`
        );
      }
      if (customDomain.hostedZone) {
        throw new Error(
          `Hosted zones can only be configured for domains hosted on Amazon Route 53. Do not set the "customDomain.hostedZone" when "isExternalDomain" is enabled.`
        );
      }
    }
  }

  protected lookupHostedZone(): IHostedZone | undefined {
    const { customDomain } = this.props;

    // Skip if customDomain is not configured
    if (!customDomain) {
      return;
    }

    let hostedZone;

    if (typeof customDomain === "string") {
      hostedZone = HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain,
      });
    } else if (customDomain.cdk?.hostedZone) {
      hostedZone = customDomain.cdk.hostedZone;
    } else if (typeof customDomain.hostedZone === "string") {
      hostedZone = HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.hostedZone,
      });
    } else if (typeof customDomain.domainName === "string") {
      // Skip if domain is not a Route53 domain
      if (customDomain.isExternalDomain === true) {
        return;
      }

      hostedZone = HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.domainName,
      });
    } else {
      hostedZone = customDomain.hostedZone;
    }

    return hostedZone;
  }

  private createCertificate(): ICertificate | undefined {
    const { customDomain } = this.props;

    if (!customDomain) {
      return;
    }

    let acmCertificate;

    // HostedZone is set for Route 53 domains
    if (this.hostedZone) {
      if (typeof customDomain === "string") {
        acmCertificate = new DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain,
          hostedZone: this.hostedZone,
          region: "us-east-1",
        });
      } else if (customDomain.cdk?.certificate) {
        acmCertificate = customDomain.cdk.certificate;
      } else {
        acmCertificate = new DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain.domainName,
          hostedZone: this.hostedZone,
          region: "us-east-1",
        });
      }
    }
    // HostedZone is NOT set for non-Route 53 domains
    else {
      if (typeof customDomain !== "string") {
        acmCertificate = customDomain.cdk?.certificate;
      }
    }

    return acmCertificate;
  }

  protected createRoute53Records(): void {
    const { customDomain } = this.props;

    if (!customDomain || !this.hostedZone) {
      return;
    }

    let recordName;
    let domainAlias;
    if (typeof customDomain === "string") {
      recordName = customDomain;
    } else {
      recordName = customDomain.domainName;
      domainAlias = customDomain.domainAlias;
    }

    // Create DNS record
    const recordProps = {
      recordName,
      zone: this.hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    };
    new ARecord(this, "AliasRecord", recordProps);
    new AaaaRecord(this, "AliasRecordAAAA", recordProps);

    // Create Alias redirect record
    if (domainAlias) {
      new HttpsRedirect(this, "Redirect", {
        zone: this.hostedZone,
        recordNames: [domainAlias],
        targetDomain: recordName,
      });
    }
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
