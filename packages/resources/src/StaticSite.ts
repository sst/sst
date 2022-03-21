import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as crypto from "crypto";
import { execSync } from "child_process";

import { Construct } from "constructs";
import {
  Token,
  Duration,
  CfnOutput,
  RemovalPolicy,
  CustomResource,
} from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Patterns from "aws-cdk-lib/aws-route53-patterns";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cfOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";

import { App } from "./App";
import { Stack } from "./Stack";
import {
  BaseSiteDomainProps,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  BaseSiteEnvironmentOutputsInfo,
  getBuildCmdEnvironment,
  buildErrorResponsesFor404ErrorPage,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite";
import { SSTConstruct } from "./Construct";

export interface StaticSiteProps {
  cdk?: {
    /**
     * Pass in a bucket configuration to override the default settings this construct uses to create the CDK `Bucket` internally.
     *
     * @example
     * ### Configuring the S3 Bucket
     *
     * Configure the internally created CDK `Bucket` instance.
     *
     * ```js {6-8}
     * import { RemovalPolicy } from "aws-cdk-lib";
     *
     * new StaticSite(this, "Site", {
     *   path: "path/to/src",
     *   cdk: {
     *     bucket: {
     *       removalPolicy: RemovalPolicy.DESTROY,
     *     },
     *   }
     * });
     * ```
     *
     * ### Configuring the CloudFront Distribution
     *
     * Configure the internally created CDK `Distribution` instance.
     *
     * ```js {3-5}
     * new StaticSite(this, "Site", {
     *   path: "path/to/src",
     *   cdk: {
     *     distribution: {
     *       comment: "Distribution for my React website",
     *     },
     *   }
     * });
     * ```
     *
     * ### Configuring the CloudFront default behavior
     *
     * The default behavior of the CloudFront distribution uses the internally created S3 bucket as the origin. You can configure this behavior.
     *
     * ```js {6-9}
     * import { ViewerProtocolPolicy, AllowedMethods } from "aws-cdk-lib/aws-cloudfront";
     *
     * new StaticSite(this, "Site", {
     *   path: "path/to/src",
     *   cfDistribution: {
     *     defaultBehavior: {
     *       viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
     *       allowedMethods: AllowedMethods.ALLOW_ALL,
     *     },
     *   },
     * });
     * ```
     */
    bucket?: s3.BucketProps;
    distribution?: BaseSiteCdkDistributionProps;
  };
  /**
   * Path to the directory where the website source is located.
   */
  path: string;
  /**
   * The name of the index page (e.g. "index.html") of the website.
   */
  indexPage?: string;
  /**
   * The error page behavior for this website. Takes either an HTML page.
   * ```
   * 404.html
   * ```
   * Or the constant "redirect_to_index_page" to redirect to the index page.
   *
   * Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.
   */
  errorPage?: string | "redirect_to_index_page";
  /**
   * The command for building the website (e.g. "npm run build").
   */
  buildCommand?: string;
  /**
   * The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.
   */
  buildOutput?: string;
  /**
   * Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.
   * @example
   *
   * ### Configuring fileOptions
   * ```js
   * {
   *   exclude: "*",
   *   include: "*.js",
   *   cacheControl: "max-age=31536000,public,immutable",
   * }
   * ```
   *
   * runs the `s3 cp` commands:
   *
   * ```bash
   * s3 cp CONTENT_DIR s3://BUCKET_NAME/deploy-2021-06-21T06:05:37.720Z --recursive --exclude * --include *.js --cache-control max-age=31536000,public,immutable
   * ```
   *
   * After the `s3 cp` commands are run, the construct will run an `s3 sync` command to upload all files not explicitely configured in `fileOptions`.
   */
  fileOptions?: {
    exclude: string | string[];
    include: string | string[];
    /**
     * @example
     * ### Configure caching
     *
     * Configure the Cache Control settings based on different file types.
     *
     * ```js {6-17}
     * new StaticSite(this, "Site", {
     *   path: "path/to/src",
     *   buildOutput: "build",
     *   buildCommand: "npm run build",
     *   errorPage: "redirect_to_index_page",
     *   fileOptions: [
     *     {
     *       exclude: "*",
     *       include: "*.html",
     *       cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
     *     },
     *     {
     *       exclude: "*",
     *       include: ["*.js", "*.css"],
     *       cacheControl: "max-age=31536000,public,immutable",
     *     },
     *   ],
     * });
     * ```
     *
     * This configures all the `.html` files to not be cached by the, while the `.js` and `.css` files to be cached forever.
     *
     * Note that, you need to specify the `exclude: "*"` along with the `include` option. It allows you to pick the files you want, while excluding everything else.
     */
    cacheControl: string;
  }[];
  /**
   * Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:
   * @example
   * ### Replace deployed values
   *
   * Replace placeholder values in your website content with the deployed values. So you don't have to hard code the config from your backend.
   *
   * ```js {6-17}
   * new StaticSite(this, "ReactSite", {
   *   path: "path/to/src",
   *   buildOutput: "build",
   *   buildCommand: "npm run build",
   *   errorPage: "redirect_to_index_page",
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
   *
   * This replaces `{{ API_URL }}` and `{{ COGNITO_USER_POOL_CLIENT_ID }}` with the deployed API endpoint and Cognito User Pool Client Id in all the `.js` files in your React app.
   */
  replaceValues?: BaseSiteReplaceProps[];
  /**
   * The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ### Configuring custom domains
   *
   * You can configure the website with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#configuring-externally-hosted-domain).
   *
   * #### Using the basic config (Route 53 domains)
   *
   * ```js {3}
   * new StaticSite(this, "Site", {
   *   path: "path/to/src",
   *   customDomain: "domain.com",
   * });
   * ```
   *
   * #### Redirect www to non-www (Route 53 domains)
   *
   * ```js {3-6}
   * new StaticSite(this, "Site", {
   *   path: "path/to/src",
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *   },
   * });
   * ```
   *
   * #### Configuring domains across stages (Route 53 domains)
   *
   * ```js {7-10}
   * export default class MyStack extends Stack {
   *   constructor(scope, id, props) {
   *     super(scope, id, props);
   *
   *     new StaticSite(this, "Site", {
   *       path: "path/to/src",
   *       customDomain: {
   *         domainName:
   *           scope.stage === "prod" ? "domain.com" : `${scope.stage}.domain.com`,
   *         domainAlias: scope.stage === "prod" ? "www.domain.com" : undefined,
   *       },
   *     });
   *   }
   * }
   * ```
   *
   * #### Using the full config (Route 53 domains)
   *
   * ```js {3-7}
   * new StaticSite(this, "Site", {
   *   path: "path/to/src",
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *     hostedZone: "domain.com",
   *   },
   * });
   * ```
   *
   * #### Importing an existing certificate (Route 53 domains)
   *
   * ```js {7}
   * import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
   *
   * new StaticSite(this, "Site", {
   *   path: "path/to/src",
   *   customDomain: {
   *     domainName: "domain.com",
   *     certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
   *   },
   * });
   * ```
   *
   * Note that, the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.
   *
   * #### Specifying a hosted zone (Route 53 domains)
   *
   * If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.
   *
   * ```js {7-10}
   * import { HostedZone } from "aws-cdk-lib/aws-route53";
   *
   * new StaticSite(this, "Site", {
   *   path: "path/to/src",
   *   customDomain: {
   *     domainName: "domain.com",
   *     hostedZone: HostedZone.fromHostedZoneAttributes(this, "MyZone", {
   *       hostedZoneId,
   *       zoneName,
   *     }),
   *   },
   * });
   * ```
   *
   * #### Configuring externally hosted domain
   *
   * ```js {5-9}
   * import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
   *
   * new StaticSite(this, "Site", {
   *   path: "path/to/src",
   *   customDomain: {
   *     isExternalDomain: true,
   *     domainName: "domain.com",
   *     certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
   *   },
   * });
   * ```
   *
   * Note that the certificate needs be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront, and validated. After the `Distribution` has been created, create a CNAME DNS record for your domain name with the `Distribution's` URL as the value. Here are more details on [configuring SSL Certificate on externally hosted domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html).
   *
   * Also note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   */
  customDomain?: string | BaseSiteDomainProps;
  /**
   * An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.
   *
   * @example
   * ### Configuring environment variables
   *
   * The `StaticSite` construct allows you to set the environment variables that are passed through your build system based on outputs from other constructs in your SST app. So you don't have to hard code the config from your backend.
   *
   * You need to be using a build tool that supports setting build time environment variables (most do). For example, Create React App [supports this through webpack](https://create-react-app.dev/docs/adding-custom-environment-variables/). We'll use it as an example.
   *
   * In your JS files this looks like:
   *
   * ```js title="src/App.js"
   * console.log(process.env.REACT_APP_API_URL);
   * console.log(process.env.REACT_APP_USER_POOL_CLIENT);
   * ```
   *
   * And in your HTML files:
   *
   * ```html title="public/index.html"
   * <p>Api endpoint is: %REACT_APP_API_URL%</p>
   * ```
   *
   * You can pass these in directly from the construct.
   *
   * ```js {3-6}
   * new StaticSite(this, "ReactSite", {
   *   path: "path/to/src",
   *   environment: {
   *     REACT_APP_API_URL: api.url,
   *     REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   },
   * });
   * ```
   *
   * Where `api.url` or `auth.cognitoUserPoolClient.userPoolClientId` are coming from other constructs in your SST app.
   *
   * #### While deploying
   *
   * On `sst deploy`, the environment variables will first be replaced by placeholder values, `{{ REACT_APP_API_URL }}` and `{{ REACT_APP_USER_POOL_CLIENT }}`, when building the app. And after the referenced resources have been created, the Api and User Pool in this case, the placeholders in the HTML and JS files will then be replaced with the actual values.
   *
   * #### While developing
   *
   * To use these values while developing, run `sst start` to start the [Live Lambda Development](../live-lambda-development.md) environment.
   *
   * ```bash
   * npx sst start
   * ```
   *
   * Then in your app to reference these variables, add the [`sst-env`](../packages/static-site-env.md) package.
   *
   * ```bash
   * npm install --save-dev @serverless-stack/static-site-env
   * ```
   *
   * And tweak the `start` script to:
   *
   * ```json title="package.json" {2}
   * "scripts": {
   *   "start": "sst-env -- react-scripts start",
   *   "build": "react-scripts build",
   *   "test": "react-scripts test",
   *   "eject": "react-scripts eject"
   * },
   * ```
   *
   * Now you can start your app as usual and it'll have the environment variables from your SST app.
   *
   * ```bash
   * npm run start
   * ```
   *
   * There are a couple of things happening behind the scenes here:
   *
   * 1. The `sst start` command generates a file with the values specified by `StaticSite`'s `environment` prop.
   * 2. The `sst-env` CLI will traverse up the directories to look for the root of your SST app.
   * 3. It'll then find the file that's generated in step 1.
   * 4. It'll load these as environment variables before running the start command.
   *
   * :::note
   * `sst-env` only works if the app is located inside the SST app or inside one of its subdirectories. For example:
   *
   * ```
   * /
   *   sst.json
   *   react-app/
   * ```
   *
   * :::
   */
  environment?: { [key: string]: string };
  /**
   * While deploying, SST removes old files that no longer exist. Pass in `false` to keep the old files around.
   */
  purgeFiles?: boolean;
  /**
   * When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.
   */
  disablePlaceholder?: boolean;

  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   */
  waitForInvalidation?: boolean;
}

/////////////////////
// Construct
/////////////////////

/**
 * The `StaticSite` construct is a higher level CDK construct that makes it easy to create a static website. It provides a simple way to build and deploy the site to an S3 bucket; setup a CloudFront CDN for fast content delivery; and configure a custom domain for the website URL. In addition:
 *
 * - Visitors to the `http://` url will be redirected to the `https://` URL.
 * - If a [domain alias](#domainalias) is configured, visitors to the alias domain will be redirected to the main one. So if `www.example.com` is the domain alias for `example.com`, visitors to `www.example.com` will be redirected to `example.com`.
 *
 * @example
 *
 * The `StaticSite` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.
 *
 * ### Creating a plain HTML site
 *
 * Deploys a plain HTML website in the `path/to/src` directory.
 *
 * ```js
 * import { StaticSite } from "@serverless-stack/resources";
 *
 * new StaticSite(this, "Site", {
 *   path: "path/to/src",
 * });
 * ```
 *
 * ### Creating a React site
 *
 * ```js
 * import { StaticSiteErrorOptions } from "@serverless-stack/resources";
 *
 * new StaticSite(this, "ReactSite", {
 *   path: "path/to/src",
 *   buildOutput: "build",
 *   buildCommand: "npm run build",
 *   errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
 * });
 * ```
 *
 * If you are using [Create React App](https://create-react-app.dev), we created the [`ReactStaticSite`](ReactStaticSite.md) construct to make it even easier to deploy React apps.
 *
 * ### Creating a Vue.js site
 *
 * ```js
 * new StaticSite(this, "VueJSSite", {
 *   path: "path/to/src",
 *   buildOutput: "dist",
 *   buildCommand: "npm run build",
 *   errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
 * });
 * ```
 *
 * ### Creating a Gatsby site
 *
 * ```js
 * new StaticSite(this, "GatsbySite", {
 *   path: "path/to/src",
 *   errorPage: "404.html",
 *   buildOutput: "public",
 *   buildCommand: "npm run build",
 * });
 * ```
 *
 * ### Creating a Jekyll site
 *
 * ```js
 * new StaticSite(this, "JekyllSite", {
 *   path: "path/to/src",
 *   errorPage: "404.html",
 *   buildOutput: "_site",
 *   buildCommand: "bundle exec jekyll build",
 * });
 * ```
 *
 * ### Creating an Angular site
 *
 * ```js
 * new StaticSite(this, "AngularSite", {
 *   path: "path/to/src",
 *   buildOutput: "dist",
 *   buildCommand: "ng build --output-path dist",
 *   errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
 * });
 * ```
 *
 * ### Creating a Svelte site
 *
 * ```js
 * new StaticSite(this, "SvelteSite", {
 *   path: "path/to/src",
 *   buildOutput: "dist",
 *   buildCommand: "npm run build",
 *   errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
 *   environment: {
 *     // Pass in the API endpoint to our app
 *     VITE_APP_API_URL: api.url,
 *   },
 * });
 * ```
 */
export class StaticSite extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK `Bucket` instance.
     */
    bucket: s3.Bucket;
    /**
     * The internally created CDK `Distribution` instance.
     */
    distribution: cloudfront.Distribution;
    /**
     * The Route 53 hosted zone for the custom domain.
     */
    hostedZone?: route53.IHostedZone;
    /*
     * The AWS Certificate Manager certificate for the custom domain.
     */
    certificate?: acm.ICertificate;
  };
  private props: StaticSiteProps;
  private isPlaceholder: boolean;
  private assets: s3Assets.Asset[];
  private filenamesAsset?: s3Assets.Asset;
  private awsCliLayer: AwsCliLayer;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const root = scope.node.root as App;
    // Local development or skip build => stub asset
    this.isPlaceholder =
      (root.local || root.skipBuild) && !props.disablePlaceholder;
    const buildDir = root.buildDir;
    const fileSizeLimit = root.isJestTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "jestFileSizeLimitOverride" not exposed in props
        props.jestFileSizeLimitOverride || 200
      : 200;

    this.props = props;
    this.cdk = {} as any;
    this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
    this.registerSiteEnvironment();

    // Validate input
    this.validateCustomDomainSettings();

    // Build app
    this.buildApp();
    this.assets = this.bundleAssets(fileSizeLimit, buildDir);
    this.filenamesAsset = this.bundleFilenamesAsset(buildDir);

    // Create Bucket
    this.cdk.bucket = this.createS3Bucket();

    // Create Custom Domain
    this.cdk.hostedZone = this.lookupHostedZone();
    this.cdk.certificate = this.createCertificate();

    // Create S3 Deployment
    const s3deployCR = this.createS3Deployment();

    // Create CloudFront
    this.cdk.distribution = this.createCfDistribution();
    this.cdk.distribution.node.addDependency(s3deployCR);

    // Invalidate CloudFront
    const invalidationCR = this.createCloudFrontInvalidation();
    invalidationCR.node.addDependency(this.cdk.distribution);

    // Connect Custom Domain to CloudFront Distribution
    this.createRoute53Records();
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url(): string {
    return `https://${this.cdk.distribution.distributionDomainName}`;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the custom domain.
   */
  public get customDomainUrl(): string | undefined {
    const { customDomain } = this.props;
    if (!customDomain) {
      return;
    }

    if (typeof customDomain === "string") {
      return `https://${customDomain}`;
    } else {
      return `https://${customDomain.domainName}`;
    }
  }

  /**
   * The ARN of the internally created CDK `Bucket` instance.
   */
  public get bucketArn(): string {
    return this.cdk.bucket.bucketArn;
  }

  /**
   * The name of the internally created CDK `Bucket` instance.
   */
  public get bucketName(): string {
    return this.cdk.bucket.bucketName;
  }

  /**
   * The ID of the internally created CDK `Distribution` instance.
   */
  public get distributionId(): string {
    return this.cdk.distribution.distributionId;
  }

  /**
   * The domain name of the internally created CDK `Distribution` instance.
   */
  public get distributionDomain(): string {
    return this.cdk.distribution.distributionDomainName;
  }

  public getConstructMetadata() {
    return {
      type: "StaticSite" as const,
      data: {
        distributionId: this.cdk.distribution.distributionId,
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  private buildApp() {
    if (this.isPlaceholder) {
      return;
    }

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
        console.log(chalk.grey(`Building static site ${sitePath}`));
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

  private bundleAssets(
    fileSizeLimit: number,
    buildDir: string
  ): s3Assets.Asset[] {
    if (this.isPlaceholder) {
      return [
        new s3Assets.Asset(this, "Asset", {
          path: path.resolve(__dirname, "../assets/StaticSite/stub"),
        }),
      ];
    }

    const { path: sitePath, buildCommand } = this.props;
    const buildOutput = this.props.buildOutput || ".";

    // validate buildOutput exists
    const siteOutputPath = path.resolve(path.join(sitePath, buildOutput));
    if (!fs.existsSync(siteOutputPath)) {
      throw new Error(
        `No build output found at "${siteOutputPath}" for the "${this.node.id}" StaticSite.`
      );
    }

    // create zip files
    const script = path.join(__dirname, "../assets/BaseSite/archiver.js");
    const zipPath = path.resolve(
      path.join(buildDir, `StaticSite-${this.node.id}-${this.node.addr}`)
    );
    // clear zip path to ensure no partX.zip remain from previous build
    fs.removeSync(zipPath);
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
        new s3Assets.Asset(this, `Asset${partId}`, {
          path: zipFilePath,
        })
      );
    }
    return assets;
  }

  private bundleFilenamesAsset(buildDir: string): s3Assets.Asset | undefined {
    if (this.isPlaceholder) {
      return;
    }
    if (this.props.purgeFiles === false) {
      return;
    }

    const zipPath = path.resolve(
      path.join(buildDir, `StaticSite-${this.node.id}-${this.node.addr}`)
    );

    // create assets
    const filenamesPath = path.join(zipPath, `filenames`);
    if (!fs.existsSync(filenamesPath)) {
      throw new Error(
        `There was a problem generating the "${this.node.id}" StaticSite package.`
      );
    }

    return new s3Assets.Asset(this, `AssetFilenames`, {
      path: filenamesPath,
    });
  }

  private createS3Bucket(): s3.Bucket {
    const { cdk } = this.props;

    // Validate s3Bucket
    if (cdk?.bucket?.websiteIndexDocument) {
      throw new Error(
        `Do not configure the "s3Bucket.websiteIndexDocument". Use the "indexPage" to configure the StaticSite index page.`
      );
    }

    if (cdk?.bucket?.websiteErrorDocument) {
      throw new Error(
        `Do not configure the "s3Bucket.websiteErrorDocument". Use the "errorPage" to configure the StaticSite index page.`
      );
    }

    return new s3.Bucket(this, "S3Bucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      ...cdk?.bucket,
    });
  }

  private createS3Deployment(): CustomResource {
    const { fileOptions } = this.props;

    // Create a Lambda function that will be doing the uploading
    const uploader = new lambda.Function(this, "S3Uploader", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-upload.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
    });
    this.cdk.bucket.grantReadWrite(uploader);
    this.assets.forEach((asset) => asset.grantRead(uploader));

    // Create the custom resource function
    const handler = new lambda.Function(this, "S3Handler", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-handler.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
      environment: {
        UPLOADER_FUNCTION_NAME: uploader.functionName,
      },
    });
    this.cdk.bucket.grantReadWrite(handler);
    this.filenamesAsset?.grantRead(handler);
    uploader.grantInvoke(handler);

    // Create custom resource
    return new CustomResource(this, "S3Deployment", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        Sources: this.assets.map((asset) => ({
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        })),
        DestinationBucketName: this.cdk.bucket.bucketName,
        Filenames: this.filenamesAsset && {
          BucketName: this.filenamesAsset.s3BucketName,
          ObjectKey: this.filenamesAsset.s3ObjectKey,
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

  private createCfDistribution(): cloudfront.Distribution {
    const { cdk, customDomain } = this.props;
    const indexPage = this.props.indexPage || "index.html";
    const errorPage = this.props.errorPage;

    // Validate input
    if (cdk?.distribution?.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the StaticSite domain certificate.`
      );
    }
    if (cdk?.distribution?.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the StaticSite domain.`
      );
    }

    // Build domainNames
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

    // Build errorResponses
    let errorResponses;
    // case: sst start => showing stub site, and redirect all routes to the index page
    if (this.isPlaceholder) {
      errorResponses = buildErrorResponsesForRedirectToIndex(indexPage);
    } else if (errorPage) {
      if (cdk?.distribution?.errorResponses) {
        throw new Error(
          `Cannot configure the "cfDistribution.errorResponses" when "errorPage" is passed in. Use one or the other to configure the behavior for error pages.`
        );
      }

      errorResponses =
        errorPage === "redirect_to_index_page"
          ? buildErrorResponsesForRedirectToIndex(indexPage)
          : buildErrorResponsesFor404ErrorPage(errorPage as string);
    }

    // Create CloudFront distribution
    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: indexPage,
      errorResponses,
      ...cdk?.distribution,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames,
      certificate: this.cdk.certificate,
      defaultBehavior: {
        origin: new cfOrigins.S3Origin(this.cdk.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        ...cdk?.distribution?.defaultBehavior,
      },
    });
  }

  private createCloudFrontInvalidation(): CustomResource {
    // Create a Lambda function that will be doing the invalidation
    const invalidator = new lambda.Function(this, "CloudFrontInvalidator", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "cf-invalidate.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
    });

    // Grant permissions to invalidate CF Distribution
    invalidator.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudfront:GetInvalidation",
          "cloudfront:CreateInvalidation",
        ],
        resources: ["*"],
      })
    );

    // Need the AssetHash field so the CR gets updated on each deploy
    const assetsHash = crypto
      .createHash("md5")
      .update(this.assets.map(({ assetHash }) => assetHash).join(""))
      .digest("hex");

    // Create custom resource
    const waitForInvalidation =
      this.props.waitForInvalidation === false ? false : true;
    return new CustomResource(this, "CloudFrontInvalidation", {
      serviceToken: invalidator.functionArn,
      resourceType: "Custom::SSTCloudFrontInvalidation",
      properties: {
        AssetsHash: assetsHash,
        DistributionId: this.cdk.distribution.distributionId,
        DistributionPaths: ["/*"],
        WaitForInvalidation: waitForInvalidation,
      },
    });
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

  protected lookupHostedZone(): route53.IHostedZone | undefined {
    const { customDomain } = this.props;

    // Skip if customDomain is not configured
    if (!customDomain) {
      return;
    }

    let hostedZone;

    if (typeof customDomain === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain,
      });
    } else if (customDomain.cdk?.hostedZone) {
      hostedZone = customDomain.cdk.hostedZone;
    } else if (typeof customDomain.hostedZone === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.hostedZone,
      });
    } else if (typeof customDomain.domainName === "string") {
      // Skip if domain is not a Route53 domain
      if (customDomain.isExternalDomain === true) {
        return;
      }

      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.domainName,
      });
    } else {
      hostedZone = customDomain.hostedZone;
    }

    return hostedZone;
  }

  private createCertificate(): acm.ICertificate | undefined {
    const { customDomain } = this.props;

    if (!customDomain) {
      return;
    }

    let acmCertificate;

    // HostedZone is set for Route 53 domains
    if (this.cdk.hostedZone) {
      if (typeof customDomain === "string") {
        acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain,
          hostedZone: this.cdk.hostedZone,
          region: "us-east-1",
        });
      } else if (customDomain.cdk?.certificate) {
        acmCertificate = customDomain.cdk.certificate;
      } else {
        acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain.domainName,
          hostedZone: this.cdk.hostedZone,
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

    if (!customDomain || !this.cdk.hostedZone) {
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
      zone: this.cdk.hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(this.cdk.distribution)
      ),
    };
    new route53.ARecord(this, "AliasRecord", recordProps);
    new route53.AaaaRecord(this, "AliasRecordAAAA", recordProps);

    // Create Alias redirect record
    if (domainAlias) {
      new route53Patterns.HttpsRedirect(this, "Redirect", {
        zone: this.cdk.hostedZone,
        recordNames: [domainAlias],
        targetDomain: recordName,
      });
    }
  }

  /////////////////////
  // Helper Functions
  /////////////////////

  private getS3ContentReplaceValues(): BaseSiteReplaceProps[] {
    const replaceValues: BaseSiteReplaceProps[] =
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

  private registerSiteEnvironment() {
    const environmentOutputs: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.props.environment || {})) {
      const outputId = `SstSiteEnv_${key}`;
      const output = new CfnOutput(this, outputId, { value });
      environmentOutputs[key] = Stack.of(this).getLogicalId(output);
    }

    const root = this.node.root as App;
    root.registerSiteEnvironment({
      id: this.node.id,
      path: this.props.path,
      stack: Stack.of(this).node.id,
      environmentOutputs,
    } as BaseSiteEnvironmentOutputsInfo);
  }
}
