import * as cdk from "@aws-cdk/core";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // React
    const site = new sst.StaticSite(this, "SPA", {
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
      s3Bucket: {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
      //cfDistribution,

      /* Jekyll
      path: "src/sites/jekyll-site",
      indexPage: "index.html",
      errorPage: "404.html",
      buildCommand: "bundle exec jekyll build",
      buildOutput: "_site",
      customDomain: "www.sst.sh",
      */

      /* Plain HTML
      path: "src/sites/website",
      indexPage: "index.html",
      errorPage: "error.html",
      */
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
