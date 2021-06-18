import * as path from "path";
import * as cdk from "@aws-cdk/core";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const edgeFunc = new cf.experimental.EdgeFunction(this, "MyFunction", {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "lambda.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../src/edge/")),
      stackId: `${scope.logicalPrefixedName("us-west-2-edge-lambda")}`,
    });

    // React
    const site = new sst.StaticSite(this, "SPA", {
      s3Bucket: {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },

      /* React
      path: "src/sites/react-app",
      indexPage: "index.html",
      errorPage: "index.html",
      buildCommand: "npm run build",
      buildOutput: "build",
      customDomain: {
        domainName: "sst.sh",
        domainAlias: "www.sst.sh",
        hostedZone: "sst.sh",
      },
      */

      /* Jekyll
      path: "src/sites/jekyll-site",
      indexPage: "index.html",
      errorPage: "404.html",
      buildCommand: "bundle exec jekyll build",
      buildOutput: "_site",
      customDomain: "www.sst.sh",
      */

      /* Plain HTML
       */
      path: "src/sites/website",
      indexPage: "index.html",
      errorPage: "error.html",
      cfDistribution: {
        defaultBehavior: {
          edgeLambdas: [
            {
              functionVersion: edgeFunc.currentVersion,
              eventType: cf.LambdaEdgeEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
    });

    this.addOutputs({
      URL: site.url,
      CustomDomainURL: site.customDomainUrl || "no-custom-domain",
      BucketArn: site.bucketArn,
      BucketName: site.bucketName,
      DistributionId: site.distributionId,
      DistributionDomain: site.distributionDomain,
    });
  }
}

/* Mike's example of configuring /auth* to and API

  // Public bucket for website
  this.websiteBucket = new Bucket(this, 'WebsiteBucket', {
    websiteIndexDocument: 'index.html',
    publicReadAccess: true
  });
const cachePolicy = new cloudfront.CachePolicy(this, "ShopifyAppPolicy", {
    defaultTtl: cdk.Duration.seconds(1),
    maxTtl: cdk.Duration.seconds(5),
    minTtl: cdk.Duration.seconds(0),
    headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Authorization"),
  })
  const originPolicy = new cloudfront.OriginRequestPolicy(this, "ShopifyAppOrigin", {
    queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all()
  })
  let staticCache
  if (scope.stage !== 'prod') {
    staticCache = cloudfront.CachePolicy.CACHING_DISABLED
  } else {
    staticCache = cloudfront.CachePolicy.CACHING_OPTIMIZED
  }
  // When not in prod direct traffic to ngrok
  let staticOrigin
  if (scope.stage !== 'prod') {
    staticOrigin = new origins.HttpOrigin(props.ngrok, {
      protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
    })
  } else {
    staticOrigin = new origins.S3Origin(this.websiteBucket)
  }
  this.distribution = new cloudfront.Distribution(this, 'Cloudfront', {
    priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    defaultRootObject: '/index.html',
    errorResponses: [{ httpStatus: 404, responsePagePath: '/index.html', responseHttpStatus: 200 }],
    defaultBehavior: {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: staticCache,
      origin: staticOrigin
    },
    additionalBehaviors: {
      "/auth*": {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cachePolicy,
        originRequestPolicy: originPolicy,
        origin: new origins.HttpOrigin(`${this.api.httpApi.httpApiId}.execute-api.${scope.region}.amazonaws.com`, {
          protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        })
      }
    }
  });
  ['GET /auth', 'GET /auth/callback'].forEach((routeKey) => {
    const fn = this.api.getFunction(routeKey)
    if (fn) { fn.addEnvironment("HOST", `${this.distribution.domainName}`) }
  })

*/
