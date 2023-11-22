import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Function } from "./function";

export interface SsrSiteArgs extends pulumi.ComponentResourceOptions {
  path: string;
}

export class SsrSite extends pulumi.ComponentResource {
  public readonly distribution: aws.cloudfront.Distribution;
  constructor(name: string, args: SsrSiteArgs) {
    super("sst:sst:SsrSite", name, args);

    const { path: sitePath } = args;

    // TODO
    // - setup custom domain
    // - upload assets
    // - create a dynamic provider

    const _this = this;

    // TODO uncomment build
    const now = Date.now();
    //buildApp();
    console.log(`open-next: ${Date.now() - now}ms`);
    const access = createCloudFrontOriginAccessIdentity();
    const bucket = createS3Bucket();
    uploadS3Assets();
    createRevalidationQueue();
    const serverFunction = createServerFunction();
    const serverOrigin = createServerOrigin();
    const imageFunction = createImageFunction();
    const imageOrigin = createImageOrigin();
    const cfFunction = createCloudFrontFunctions();
    const s3Origin = createS3Origin();
    const distribution = createCloudFrontDistribution();
    createDistributionInvalidation();

    this.distribution = distribution;

    function buildApp() {
      try {
        execSync("npx --yes open-next@latest build", {
          cwd: sitePath,
          stdio: "inherit",
          env: {
            SST: "1",
            ...process.env,
            //...getBuildCmdEnvironment(environment),
          },
        });
      } catch (e) {
        throw new Error(`There was a problem building the "${name}" site.`);
      }
    }

    function uploadS3Assets() {
      const addFolderContents = (siteDir: string, prefix: string) => {
        for (let item of fs.readdirSync(siteDir)) {
          let filePath = path.join(siteDir, item);
          let isDir = fs.lstatSync(filePath).isDirectory();

          // This handles adding subfolders and their content
          if (isDir) {
            const newPrefix = prefix ? path.join(prefix, item) : item;
            addFolderContents(filePath, newPrefix);
            continue;
          }

          let itemPath = prefix ? path.join(prefix, item) : item;
          itemPath = itemPath.replace(/\\/g, "/"); // convert Windows paths to something S3 will recognize

          new aws.s3.BucketObject(itemPath, {
            bucket: bucket.bucket,
            source: new pulumi.asset.FileAsset(filePath), // use FileAsset to point to a file
            contentType: getContentType(filePath, "UTF-8"),
            cacheControl:
              "public,max-age=0,s-maxage=86400,stale-while-revalidate=8640",
          });
        }
      };

      addFolderContents(path.join(sitePath, ".open-next/assets"), "_assets");
      addFolderContents(path.join(sitePath, ".open-next/cache"), "_cache");
    }

    function createCloudFrontOriginAccessIdentity() {
      return new aws.cloudfront.OriginAccessIdentity(
        `${name}-origin-access-identity`,
        {},
      );
    }

    function createCloudFrontFunctions() {
      return new aws.cloudfront.Function(
        `${name}-cfFunction`,
        {
          runtime: "cloudfront-js-1.0",
          code: `
    function handler(event) {
      var request = event.request;
      request.headers["x-forwarded-host"] = request.headers.host;
      return request;
    }`,
        },
        { parent: _this },
      );
    }

    function createS3Origin() {
      return {
        domainName: bucket.bucketRegionalDomainName,
        originId: "s3OriginId",
        originPath: "/_assets",
        s3OriginConfig: {
          originAccessIdentity: access.cloudfrontAccessIdentityPath,
        },
      };
    }

    function createServerOrigin() {
      const url = new aws.lambda.FunctionUrl(`${name}-server-url`, {
        authorizationType: "NONE",
        functionName: serverFunction.name,
      });

      return {
        originId: "serverOriginId",
        domainName: url.functionUrl.apply((url) => new URL(url).host),
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "https-only",
          originReadTimeout: 10,
          originSslProtocols: ["TLSv1.2"],
        },
      };
    }

    function createImageOrigin() {
      const url = new aws.lambda.FunctionUrl(`${name}-image-url`, {
        authorizationType: "NONE",
        functionName: imageFunction.name,
      });

      return {
        originId: "imageOriginId",
        domainName: url.functionUrl.apply((url) => new URL(url).host),
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "https-only",
          originReadTimeout: 10,
          originSslProtocols: ["TLSv1.2"],
        },
      };
    }

    function createCloudFrontDistribution() {
      const serverCachePolicy = new aws.cloudfront.CachePolicy(
        `${name}-cache-policy`,
        {
          comment: "SST server response cache policy",
          defaultTtl: 0,
          minTtl: 0,
          maxTtl: 365,
          parametersInCacheKeyAndForwardedToOrigin: {
            cookiesConfig: {
              cookieBehavior: "none",
            },
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
            headersConfig: {
              headerBehavior: "whitelist",
              headers: {
                items: [
                  "accept",
                  "rsc",
                  "next-router-prefetch",
                  "next-router-state-tree",
                  "next-url",
                ],
              },
            },
            queryStringsConfig: {
              queryStringBehavior: "all",
            },
          },
        },
      );

      return new aws.cloudfront.Distribution(`${name}-distribution`, {
        defaultRootObject: "",
        origins: [s3Origin, serverOrigin, imageOrigin],
        defaultCacheBehavior: {
          viewerProtocolPolicy: "redirect-to-https",
          targetOriginId: serverOrigin.originId,
          allowedMethods: [
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
          cachePolicyId: serverCachePolicy.id,
          originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
          functionAssociations: [
            {
              eventType: "viewer-request",
              functionArn: cfFunction.arn,
            },
          ],
        },
        orderedCacheBehaviors: [
          {
            pathPattern: "api/*",
            viewerProtocolPolicy: "redirect-to-https",
            targetOriginId: serverOrigin.originId,
            allowedMethods: [
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
            cachePolicyId: serverCachePolicy.id,
            originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
            functionAssociations: [
              {
                eventType: "viewer-request",
                functionArn: cfFunction.arn,
              },
            ],
          },
          {
            pathPattern: "_next/data/*",
            viewerProtocolPolicy: "redirect-to-https",
            targetOriginId: serverOrigin.originId,
            allowedMethods: [
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
            cachePolicyId: serverCachePolicy.id,
            originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
            functionAssociations: [
              {
                eventType: "viewer-request",
                functionArn: cfFunction.arn,
              },
            ],
          },
          {
            pathPattern: "_next/image*",
            viewerProtocolPolicy: "redirect-to-https",
            targetOriginId: imageOrigin.originId,
            allowedMethods: [
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
            cachePolicyId: serverCachePolicy.id,
            originRequestPolicyId: "b689b0a8-53d0-40ab-baf2-68738e2966ac",
            functionAssociations: [
              {
                eventType: "viewer-request",
                functionArn: cfFunction.arn,
              },
            ],
          },
          ...fs
            .readdirSync(path.join(sitePath, ".open-next/assets"))
            .map((item: any) => ({
              pathPattern: fs
                .statSync(path.join(sitePath, ".open-next/assets", item))
                .isDirectory()
                ? `${item}/*`
                : item,
              viewerProtocolPolicy: "redirect-to-https",
              targetOriginId: s3Origin.originId,
              allowedMethods: ["GET", "HEAD", "OPTIONS"],
              cachedMethods: ["GET", "HEAD"],
              compress: true,
              cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
              functionAssociations: [
                {
                  eventType: "viewer-request",
                  functionArn: cfFunction.arn,
                },
              ],
            })),
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
      });
    }

    function createDistributionInvalidation() {
      //new command.local.Command("invalidate", {
      //  create: pulumi.interpolate`aws cloudfront create-invalidation --distribution-id ${distribution.id} --paths index.html`
      //  environment: {
      //    ETAG: indexFile.etag
      //  }
      //}, {
      //    replaceOnChanges: ["environment"]
      //});
    }

    function createS3Bucket() {
      const bucket = new aws.s3.BucketV2(
        `${name}-bucket`,
        {},
        { parent: _this },
      );
      new aws.s3.BucketPublicAccessBlock("exampleBucketPublicAccessBlock", {
        bucket: bucket.id,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      });
      const policyDocument = aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            principals: [
              {
                type: "AWS",
                identifiers: [pulumi.interpolate`${access.iamArn}`],
              },
            ],
            actions: ["s3:GetObject"],
            resources: [pulumi.interpolate`${bucket.arn}/*`],
          },
        ],
      });
      new aws.s3.BucketPolicy("allowAccessFromAnotherAccountBucketPolicy", {
        bucket: bucket.id,
        policy: policyDocument.apply((policyDocument) => policyDocument.json),
      });
      return bucket;
    }

    function createServerFunction() {
      // TODO create a function using S3 asset and compare the upload performance
      const BUILD_ID = fs
        .readFileSync(path.join(sitePath, ".next", "BUILD_ID"))
        .toString();

      return new Function(`${name}-server`, {
        description: "Next.js server",
        handler: "index.handler",
        bundle: path.join(sitePath, ".open-next", "server-function"),
        bundleHash: BUILD_ID,
        runtime: "nodejs18.x",
        timeout: 30,
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
        environment: {
          variables: {
            CACHE_BUCKET_NAME: bucket.bucket,
            CACHE_BUCKET_KEY_PREFIX: "_cache",
            CACHE_BUCKET_REGION: aws.getRegion().then((r) => r.name),
          },
        },
      });
    }

    function createImageFunction() {
      const serverRole = new aws.iam.Role(`${name}-image-optimization-role`, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "lambda.amazonaws.com",
        }),
        inlinePolicies: [
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
        managedPolicyArns: [
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        ],
      });

      return new aws.lambda.Function(`${name}-image`, {
        description: "Next.js server",
        handler: "index.handler",
        code: new pulumi.asset.FileArchive(
          path.join(sitePath, ".open-next", "image-optimization-function"),
        ),
        runtime: "nodejs18.x",
        memorySize: 1536,
        architectures: ["arm64"],
        timeout: 30,
        role: serverRole.arn,
        environment: {
          variables: {
            BUCKET_NAME: bucket.bucket,
            BUCKET_KEY_PREFIX: "_assets",
          },
        },
      });
    }

    function createRevalidationQueue() {
      const queue = new aws.sqs.Queue(`${name}-revalidation-queue`, {
        fifoQueue: true,
        receiveWaitTimeSeconds: 20,
      });
      const consumerRole = new aws.iam.Role(
        `${name}-revalidation-consumer-role`,
        {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "lambda.amazonaws.com",
          }),
          inlinePolicies: [
            {
              name: "sqs",
              policy: queue.arn.apply((arn) =>
                aws.iam
                  .getPolicyDocument({
                    statements: [
                      {
                        actions: ["sqs:*"],
                        resources: [arn],
                      },
                    ],
                  })
                  .then((doc) => doc.json),
              ),
            },
          ],
          managedPolicyArns: [
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          ],
        },
      );
      const consumer = new aws.lambda.Function(
        `${name}-revalidation-consumer`,
        {
          handler: "index.handler",
          code: new pulumi.asset.FileArchive(
            path.join(sitePath, ".open-next", "revalidation-function"),
          ),
          runtime: "nodejs18.x",
          timeout: 30,
          role: consumerRole.arn,
        },
      );
      new aws.lambda.EventSourceMapping(
        `${name}-revalidation-consumer-event-source`,
        {
          functionName: consumer.name,
          eventSourceArn: queue.arn,
        },
      );
    }
  }
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
