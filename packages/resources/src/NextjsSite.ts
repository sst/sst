import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import { execSync } from "child_process";

import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as route53Patterns from "aws-cdk-lib/aws-route53-patterns";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { RoutesManifest } from "@serverless-stack/nextjs-lambda";

import { App } from "./App";
import { SSTConstruct, isCDKConstruct } from "./Construct";
import {
  BaseSiteDomainProps,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  BaseSiteEnvironmentOutputsInfo,
  getBuildCmdEnvironment,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite";
import { Permissions, attachPermissionsToRole } from "./util/permission";
import { getHandlerHash } from "./util/builder";
import * as crossRegionHelper from "./nextjs-site/cross-region-helper";

export interface NextjsSiteProps {
  path: string;
  s3Bucket?: s3.BucketProps;
  customDomain?: string | NextjsSiteDomainProps;
  cfCachePolicies?: NextjsSiteCachePolicyProps;
  cfDistribution?: NextjsSiteCdkDistributionProps;
  environment?: { [key: string]: string };
  defaultFunctionProps?: NextjsSiteFunctionProps;
  disablePlaceholder?: boolean;
}

export interface NextjsSiteFunctionProps {
  timeout?: number;
  memorySize?: number;
  permissions?: Permissions;
}

export interface NextjsSiteCachePolicyProps {
  staticCachePolicy?: cloudfront.ICachePolicy;
  imageCachePolicy?: cloudfront.ICachePolicy;
  lambdaCachePolicy?: cloudfront.ICachePolicy;
}

export type NextjsSiteDomainProps = BaseSiteDomainProps;
export type NextjsSiteCdkDistributionProps = BaseSiteCdkDistributionProps;

export class NextjsSite extends Construct implements SSTConstruct {
  public static staticCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    defaultTtl: cdk.Duration.days(30),
    maxTtl: cdk.Duration.days(30),
    minTtl: cdk.Duration.days(30),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST NextjsSite Static Default Cache Policy",
  };

  public static imageCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    defaultTtl: cdk.Duration.days(1),
    maxTtl: cdk.Duration.days(365),
    minTtl: cdk.Duration.days(0),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST NextjsSite Image Default Cache Policy",
  };

  public static lambdaCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    defaultTtl: cdk.Duration.seconds(0),
    maxTtl: cdk.Duration.days(365),
    minTtl: cdk.Duration.seconds(0),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST NextjsSite Lambda Default Cache Policy",
  };

  public readonly s3Bucket: s3.Bucket;
  public readonly cfDistribution: cloudfront.Distribution;
  public readonly hostedZone?: route53.IHostedZone;
  public readonly acmCertificate?: acm.ICertificate;
  private readonly props: NextjsSiteProps;
  private readonly deployId: string;
  private readonly isPlaceholder: boolean;
  private readonly buildOutDir: string | null;
  private readonly assets: s3Assets.Asset[];
  private readonly awsCliLayer: AwsCliLayer;
  private readonly routesManifest: RoutesManifest | null;
  private readonly edgeLambdaRole: iam.Role;
  private readonly mainFunctionVersion: lambda.IVersion;
  private readonly apiFunctionVersion: lambda.IVersion;
  private readonly imageFunctionVersion: lambda.IVersion;
  private readonly regenerationQueue: sqs.Queue;
  private readonly regenerationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: NextjsSiteProps) {
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
    this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
    this.registerSiteEnvironment();

    // Build app
    if (this.isPlaceholder) {
      this.buildOutDir = null;
      this.assets = this.zipAppStubAssets();
      this.deployId = `deploy-live`;
      this.routesManifest = null;
    } else {
      this.buildOutDir = root.isJestTest()
        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore: "jestBuildOutputPath" not exposed in props
          props.jestBuildOutputPath || this.buildApp()
        : this.buildApp();
      const buildIdFile = path.resolve(this.buildOutDir!, "assets", "BUILD_ID");
      const buildId = fs.readFileSync(buildIdFile).toString();
      this.assets = this.zipAppAssets(fileSizeLimit, buildDir);
      this.deployId = `deploy-${buildId}`;
      this.routesManifest = this.readRoutesManifest();
    }

    // Create Bucket
    this.s3Bucket = this.createS3Bucket();

    // Handle Incremental Static Regeneration
    this.regenerationQueue = this.createRegenerationQueue();
    this.regenerationFunction = this.createRegenerationFunction();

    // Create Lambda@Edge functions (always created in us-east-1)
    this.edgeLambdaRole = this.createEdgeFunctionRole();
    this.mainFunctionVersion = this.createEdgeFunction(
      "Main",
      "default-lambda"
    );
    this.apiFunctionVersion = this.createEdgeFunction("Api", "api-lambda");
    this.imageFunctionVersion = this.createEdgeFunction(
      "Image",
      "image-lambda"
    );

    // Create Custom Domain
    this.validateCustomDomainSettings();
    this.hostedZone = this.lookupHostedZone();
    this.acmCertificate = this.createCertificate();

    // Create S3 Deployment
    const s3deployCR = this.createS3Deployment();

    // Create CloudFront
    this.cfDistribution = this.createCloudFrontDistribution();
    this.cfDistribution.node.addDependency(s3deployCR);

    // Invalidate CloudFront
    const invalidationCR = this.createCloudFrontInvalidation();
    invalidationCR.node.addDependency(this.cfDistribution);

    // Connect Custom Domain to CloudFront Distribution
    this.createRoute53Records();
  }

  public get url(): string {
    return `https://${this.cfDistribution.distributionDomainName}`;
  }

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

  public get bucketArn(): string {
    return this.s3Bucket.bucketArn;
  }

  public get bucketName(): string {
    return this.s3Bucket.bucketName;
  }

  public get distributionId(): string {
    return this.cfDistribution.distributionId;
  }

  public get distributionDomain(): string {
    return this.cfDistribution.distributionDomainName;
  }

  public attachPermissions(permissions: Permissions): void {
    attachPermissionsToRole(this.edgeLambdaRole, permissions);
  }

  public getConstructMetadata() {
    return {
      type: "NextSite" as const,
      data: {
        distributionId: this.cfDistribution.distributionId,
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  private zipAppAssets(
    fileSizeLimit: number,
    buildDir: string
  ): s3Assets.Asset[] {
    // validate buildOutput exists
    const siteOutputPath = path.resolve(path.join(this.buildOutDir!, "assets"));
    if (!fs.existsSync(siteOutputPath)) {
      throw new Error(
        `No build output found at "${siteOutputPath}" for the "${this.node.id}" NextjsSite.`
      );
    }

    // create zip files
    const script = path.join(__dirname, "../assets/BaseSite/archiver.js");
    const zipPath = path.resolve(
      path.join(buildDir, `NextjsSite-${this.node.id}-${this.node.addr}`)
    );
    // clear zip path to ensure no partX.zip remain from previous build
    fs.removeSync(zipPath);
    const cmd = ["node", script, siteOutputPath, zipPath, fileSizeLimit].join(
      " "
    );

    try {
      execSync(cmd, {
        stdio: "inherit",
      });
    } catch (e) {
      throw new Error(
        `There was a problem generating the "${this.node.id}" NextjsSite package.`
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

  private zipAppStubAssets(): s3Assets.Asset[] {
    return [
      new s3Assets.Asset(this, "Asset", {
        path: path.resolve(__dirname, "../assets/NextjsSite/site-stub"),
      }),
    ];
  }

  private createEdgeFunction(
    name: string,
    handlerPath: string
  ): lambda.IVersion {
    // Use real code if:
    // - Next.js app was build; AND
    // - the Lambda code directory is not empty
    const hasRealCode =
      typeof this.buildOutDir === "string" &&
      fs.pathExistsSync(path.join(this.buildOutDir, handlerPath, "index.js"));

    // Create function asset
    const assetPath =
      hasRealCode && this.buildOutDir
        ? path.join(this.buildOutDir, handlerPath)
        : path.join(__dirname, "../assets/NextjsSite/edge-lambda-stub");
    const asset = new s3Assets.Asset(this, `${name}FunctionAsset`, {
      path: assetPath,
    });

    // Create function based on region
    const root = this.node.root as App;
    return root.region === "us-east-1"
      ? this.createEdgeFunctionInUE1(name, assetPath, asset, hasRealCode)
      : this.createEdgeFunctionInNonUE1(name, assetPath, asset, hasRealCode);
  }

  private createEdgeFunctionInUE1(
    name: string,
    assetPath: string,
    asset: s3Assets.Asset,
    hasRealCode: boolean
  ): lambda.IVersion {
    const { defaultFunctionProps: fnProps } = this.props;

    // Create function
    const fn = new lambda.Function(this, `${name}Function`, {
      description: `${name} handler for Next.js`,
      handler: "index.handler",
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(assetPath),
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: fnProps?.memorySize || 512,
      timeout: cdk.Duration.seconds(fnProps?.timeout || 10),
      role: this.edgeLambdaRole,
    });

    // Create alias
    fn.currentVersion.addAlias("live");

    // Deploy after the code is updated
    if (hasRealCode) {
      const updaterCR = this.createLambdaCodeReplacer(name, asset);
      fn.node.addDependency(updaterCR);
    }

    return fn.currentVersion;
  }

  private createEdgeFunctionInNonUE1(
    name: string,
    assetPath: string,
    asset: s3Assets.Asset,
    hasRealCode: boolean
  ): lambda.IVersion {
    const { defaultFunctionProps: fnProps } = this.props;

    // If app region is NOT us-east-1, create a Function in us-east-1
    // using a Custom Resource

    // Create a S3 bucket in us-east-1 to store Lambda code. Create
    // 1 bucket for all Edge functions.
    const bucketCR = crossRegionHelper.getOrCreateBucket(this);
    const bucketName = bucketCR.getAttString("BucketName");

    // Create a Lambda function in us-east-1
    const functionCR = crossRegionHelper.createFunction(
      this,
      name,
      this.edgeLambdaRole,
      bucketName,
      {
        Description: `handler for Next.js`,
        Handler: "index.handler",
        Code: {
          S3Bucket: asset.s3BucketName,
          S3Key: asset.s3ObjectKey,
        },
        Runtime: lambda.Runtime.NODEJS_12_X.name,
        MemorySize: fnProps?.memorySize || 512,
        Timeout: cdk.Duration.seconds(fnProps?.timeout || 10).toSeconds(),
        Role: this.edgeLambdaRole.roleArn,
      }
    );
    const functionArn = functionCR.getAttString("FunctionArn");

    // Create a Lambda function version in us-east-1
    const versionCR = crossRegionHelper.createVersion(this, name, functionArn);
    const versionId = versionCR.getAttString("Version");
    crossRegionHelper.updateVersionLogicalId(functionCR, versionCR);

    // Deploy after the code is updated
    if (hasRealCode) {
      const updaterCR = this.createLambdaCodeReplacer(name, asset);
      functionCR.node.addDependency(updaterCR);
    }

    return lambda.Version.fromVersionArn(
      this,
      `${name}FunctionVersion`,
      `${functionArn}:${versionId}`
    );
  }

  private createEdgeFunctionRole(): iam.Role {
    const { defaultFunctionProps: fnProps } = this.props;

    // Create function role
    const role = new iam.Role(this, `EdgeLambdaRole`, {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("edgelambda.amazonaws.com")
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          "EdgeLambdaPolicy",
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Attach permission
    this.s3Bucket.grantReadWrite(role);
    this.regenerationQueue.grantSendMessages(role);
    this.regenerationFunction.grantInvoke(role);
    if (fnProps?.permissions) {
      attachPermissionsToRole(role, fnProps.permissions);
    }

    return role;
  }

  private createRegenerationQueue(): sqs.Queue {
    return new sqs.Queue(this, "RegenerationQueue", {
      // We call the queue the same name as the bucket so that we can easily
      // reference it from within the lambda@edge, given we can't use env vars
      // in a lambda@edge
      queueName: `${this.s3Bucket.bucketName}.fifo`,
      fifo: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private createRegenerationFunction(): lambda.Function {
    // Use real code if:
    // - Next.js app was build; AND
    // - the Lambda code directory is not empty
    let code;
    let updaterCR;
    if (
      this.buildOutDir &&
      fs.pathExistsSync(
        path.join(this.buildOutDir, "regeneration-lambda", "index.js")
      )
    ) {
      const asset = new s3Assets.Asset(this, `RegenerationFunctionAsset`, {
        path: path.join(this.buildOutDir, "regeneration-lambda"),
      });
      code = lambda.Code.fromAsset(
        path.join(this.buildOutDir, "regeneration-lambda")
      );
      updaterCR = this.createLambdaCodeReplacer("Regeneration", asset);
    } else {
      code = lambda.Code.fromInline("  ");
    }

    const fn = new lambda.Function(this, "RegenerationFunction", {
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(30),
      code,
    });

    fn.addEventSource(
      new lambdaEventSources.SqsEventSource(this.regenerationQueue)
    );

    // Grant permissions
    this.s3Bucket.grantReadWrite(fn);

    // Deploy after the code is updated
    if (updaterCR) {
      fn.node.addDependency(updaterCR);
    }

    return fn;
  }

  private createLambdaCodeReplacer(
    name: string,
    asset: s3Assets.Asset
  ): cdk.CustomResource {
    // Note: Source code for the Lambda functions have "{{ ENV_KEY }}" in them.
    //       They need to be replaced with real values before the Lambda
    //       functions get deployed.

    const providerId = "LambdaCodeReplacerProvider";
    const resId = `${name}LambdaCodeReplacer`;
    const stack = cdk.Stack.of(this);
    let provider = stack.node.tryFindChild(providerId) as lambda.Function;

    // Create provider if not already created
    if (!provider) {
      provider = new lambda.Function(stack, providerId, {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../assets/NextjsSite/custom-resource")
        ),
        layers: [this.awsCliLayer],
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "lambda-code-updater.handler",
        timeout: cdk.Duration.minutes(15),
        memorySize: 1024,
      });
    }

    // Allow provider to perform search/replace on the asset
    provider.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [`arn:aws:s3:::${asset.s3BucketName}/${asset.s3ObjectKey}`],
      })
    );

    // Create custom resource
    const resource = new cdk.CustomResource(this, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTLambdaCodeUpdater",
      properties: {
        Source: {
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        },
        ReplaceValues: this.getLambdaContentReplaceValues(),
      },
    });

    return resource;
  }

  private buildApp(): string {
    const { path: sitePath } = this.props;

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(
        `No path found at "${path.resolve(sitePath)}" for the "${
          this.node.id
        }" NextjsSite.`
      );
    }

    // Build command
    // Note: probably could pass JSON string also, but this felt safer.
    const root = this.node.root as App;
    const pathHash = getHandlerHash(sitePath);
    const buildOutput = path.join(root.buildDir, pathHash);
    const configBuffer = Buffer.from(
      JSON.stringify({
        cwd: path.resolve(sitePath),
        args: ["build"],
      })
    );
    const cmd = [
      "node",
      path.join(__dirname, "../assets/NextjsSite/build.js"),
      "--path",
      path.resolve(sitePath),
      "--output",
      path.resolve(buildOutput),
      "--config",
      configBuffer.toString("base64"),
    ].join(" ");

    // Run build
    try {
      console.log(chalk.grey(`Building Next.js site ${sitePath}`));
      execSync(cmd, {
        cwd: sitePath,
        stdio: "inherit",
        env: {
          ...process.env,
          ...getBuildCmdEnvironment(this.props.environment),
        },
      });
    } catch (e) {
      throw new Error(
        `There was a problem building the "${this.node.id}" NextjsSite.`
      );
    }

    return buildOutput;
  }

  private createS3Bucket(): s3.Bucket {
    let { s3Bucket } = this.props;
    s3Bucket = s3Bucket || {};

    return new s3.Bucket(this, "Bucket", {
      publicReadAccess: true,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      ...s3Bucket,
    });
  }

  private createS3Deployment(): cdk.CustomResource {
    // Create a Lambda function that will be doing the uploading
    const uploader = new lambda.Function(this, "S3Uploader", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-upload.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
    });
    this.s3Bucket.grantReadWrite(uploader);
    this.assets.forEach((asset) => asset.grantRead(uploader));

    // Create the custom resource function
    const handler = new lambda.Function(this, "S3Handler", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-handler.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        UPLOADER_FUNCTION_NAME: uploader.functionName,
      },
    });
    this.s3Bucket.grantReadWrite(handler);
    uploader.grantInvoke(handler);

    // Create custom resource
    const fileOptions = [
      {
        exclude: "*",
        include: "public/*",
        cacheControl: "public,max-age=31536000,must-revalidate",
      },
      {
        exclude: "*",
        include: "static/*",
        cacheControl: "public,max-age=31536000,must-revalidate",
      },
      {
        exclude: "*",
        include: "static-pages/*",
        cacheControl: "public,max-age=0,s-maxage=2678400,must-revalidate",
      },
      {
        exclude: "*",
        include: "_next/data/*",
        cacheControl: "public,max-age=0,s-maxage=2678400,must-revalidate",
      },
      {
        exclude: "*",
        include: "_next/static/*",
        cacheControl: "public,max-age=31536000,immutable",
      },
    ];
    return new cdk.CustomResource(this, "S3Deployment", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        Sources: this.assets.map((asset) => ({
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        })),
        DestinationBucketName: this.s3Bucket.bucketName,
        DestinationBucketKeyPrefix: this.deployId,
        FileOptions: (fileOptions || []).map(
          ({ exclude, include, cacheControl }) => {
            return [
              "--exclude",
              exclude,
              "--include",
              include,
              "--cache-control",
              cacheControl,
            ];
          }
        ),
        ReplaceValues: this.getS3ContentReplaceValues(),
      },
    });
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private createCloudFrontDistribution(): cloudfront.Distribution {
    const { cfCachePolicies, cfDistribution, customDomain } = this.props;
    const cfDistributionProps = cfDistribution || {};

    // Validate input
    if (cfDistributionProps.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the NextjsSite domain certificate.`
      );
    }
    if (cfDistributionProps.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the NextjsSite domain.`
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
    }

    // Build behavior
    const origin = new origins.S3Origin(this.s3Bucket, {
      originPath: this.deployId,
    });
    const viewerProtocolPolicy =
      cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;

    if (this.isPlaceholder) {
      return new cloudfront.Distribution(this, "Distribution", {
        defaultRootObject: "index.html",
        errorResponses: buildErrorResponsesForRedirectToIndex("index.html"),
        domainNames,
        certificate: this.acmCertificate,
        defaultBehavior: {
          origin,
          viewerProtocolPolicy,
        },
      });
    }

    // Build Edge functions
    const edgeLambdas: cloudfront.EdgeLambda[] = [
      {
        includeBody: true,
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
        functionVersion: this.mainFunctionVersion,
      },
      {
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
        functionVersion: this.mainFunctionVersion,
      },
    ];

    // Build cache policy
    const staticCachePolicy =
      cfCachePolicies?.staticCachePolicy ??
      this.createCloudFrontStaticCachePolicy();
    const imageCachePolicy =
      cfCachePolicies?.imageCachePolicy ??
      this.createCloudFrontImageCachePolicy();
    const lambdaCachePolicy =
      cfCachePolicies?.lambdaCachePolicy ??
      this.createCloudFrontLambdaCachePolicy();

    // Create Distribution
    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames,
      certificate: this.acmCertificate,
      defaultBehavior: {
        viewerProtocolPolicy,
        origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: lambdaCachePolicy,
        ...(cfDistributionProps.defaultBehavior || {}),
        // concatenate edgeLambdas
        edgeLambdas: [
          ...edgeLambdas,
          ...(cfDistributionProps.defaultBehavior?.edgeLambdas || []),
        ],
      },
      additionalBehaviors: {
        [this.pathPattern("_next/image*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: imageCachePolicy,
          originRequestPolicy: new cloudfront.OriginRequestPolicy(
            this,
            "ImageOriginRequest",
            {
              queryStringBehavior:
                cloudfront.OriginRequestQueryStringBehavior.all(),
            }
          ),
          edgeLambdas: [
            {
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: this.imageFunctionVersion,
            },
          ],
        },
        [this.pathPattern("_next/data/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: lambdaCachePolicy,
          edgeLambdas,
        },
        [this.pathPattern("_next/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: staticCachePolicy,
        },
        [this.pathPattern("static/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: staticCachePolicy,
        },
        [this.pathPattern("api/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: lambdaCachePolicy,
          edgeLambdas: [
            {
              includeBody: true,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: this.apiFunctionVersion,
            },
          ],
        },
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  private createCloudFrontStaticCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "StaticsCache",
      NextjsSite.staticCachePolicyProps
    );
  }

  private createCloudFrontImageCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "ImageCache",
      NextjsSite.imageCachePolicyProps
    );
  }

  private createCloudFrontLambdaCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "LambdaCache",
      NextjsSite.lambdaCachePolicyProps
    );
  }

  private createCloudFrontInvalidation(): cdk.CustomResource {
    // Create a Lambda function that will be doing the invalidation
    const invalidator = new lambda.Function(this, "CloudFrontInvalidator", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "cf-invalidate.handler",
      timeout: cdk.Duration.minutes(15),
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

    // Create custom resource
    return new cdk.CustomResource(this, "CloudFrontInvalidation", {
      serviceToken: invalidator.functionArn,
      resourceType: "Custom::SSTCloudFrontInvalidation",
      properties: {
        // need the DeployId field so this CR gets updated on each deploy
        DeployId: this.deployId,
        DistributionId: this.cfDistribution.distributionId,
        DistributionPaths: ["/*"],
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
      if (!customDomain.certificate) {
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
    } else if (isCDKConstruct(customDomain.hostedZone)) {
      hostedZone = customDomain.hostedZone as route53.IHostedZone;
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
    if (this.hostedZone) {
      if (typeof customDomain === "string") {
        acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain,
          hostedZone: this.hostedZone,
          region: "us-east-1",
        });
      } else if (customDomain.certificate) {
        acmCertificate = customDomain.certificate;
      } else {
        acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain.domainName,
          hostedZone: this.hostedZone,
          region: "us-east-1",
        });
      }
    }
    // HostedZone is NOT set for non-Route 53 domains
    else {
      if (typeof customDomain !== "string") {
        acmCertificate = customDomain.certificate;
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
    new route53.ARecord(this, "AliasRecord", {
      recordName,
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(this.cfDistribution)
      ),
    });

    // Create Alias redirect record
    if (domainAlias) {
      new route53Patterns.HttpsRedirect(this, "Redirect", {
        zone: this.hostedZone,
        recordNames: [domainAlias],
        targetDomain: recordName,
      });
    }
  }

  /////////////////////
  // Helper Functions
  /////////////////////

  private pathPattern(pattern: string): string {
    const { basePath } = this.routesManifest || {};
    return basePath && basePath.length > 0
      ? `${basePath.slice(1)}/${pattern}`
      : pattern;
  }

  private readRoutesManifest(): RoutesManifest {
    return fs.readJSONSync(
      path.join(this.buildOutDir!, "default-lambda/routes-manifest.json")
    );
  }

  private getS3ContentReplaceValues(): BaseSiteReplaceProps[] {
    const replaceValues: BaseSiteReplaceProps[] = [];

    Object.entries(this.props.environment || {})
      .filter(([, value]) => cdk.Token.isUnresolved(value))
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
          },
          {
            files: "**/*.json",
            search: token,
            replace: value,
          }
        );
      });
    return replaceValues;
  }

  private getLambdaContentReplaceValues(): BaseSiteReplaceProps[] {
    const replaceValues: BaseSiteReplaceProps[] = [];

    // The Next.js app can have environment variables like
    // `process.env.API_URL` in the JS code. `process.env.API_URL` might or
    // might not get resolved on `next build` if it is used in
    // server-side functions, ie. getServerSideProps().
    // Because Lambda@Edge does not support environment variables, we will
    // use the trick of replacing "{{ _SST_NEXTJS_SITE_ENVIRONMENT_ }}" with
    // a JSON encoded string of all environment key-value pairs. This string
    // will then get decoded at run time.
    const lambdaEnvs: { [key: string]: string } = {};

    Object.entries(this.props.environment || {}).forEach(([key, value]) => {
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
        },
        {
          files: "**/*.json",
          search: token,
          replace: value,
        }
      );
      lambdaEnvs[key] = value;
    });

    replaceValues.push({
      files: "**/*.js",
      search: '"{{ _SST_NEXTJS_SITE_ENVIRONMENT_ }}"',
      replace: JSON.stringify(lambdaEnvs),
    });

    return replaceValues;
  }

  private registerSiteEnvironment() {
    const environmentOutputs: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.props.environment || {})) {
      const outputId = `SstSiteEnv_${key}`;
      const output = new cdk.CfnOutput(this, outputId, { value });
      environmentOutputs[key] = cdk.Stack.of(this).getLogicalId(output);
    }

    const root = this.node.root as App;
    root.registerSiteEnvironment({
      id: this.node.id,
      path: this.props.path,
      stack: cdk.Stack.of(this).node.id,
      environmentOutputs,
    } as BaseSiteEnvironmentOutputsInfo);
  }
}
