import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const site = new sst.NextjsSite(this, "NextJsApp", {
      customDomain: {
        domainName: "next-ca.sst.sh",
        domainAlias: "www.next-ca.sst.sh",
        hostedZone: "sst.sh",
      },
      path: "src/sites/nextjs",
      environment: {
        API_URL: props.api.url,
        NEXT_PUBLIC_API_URL: props.api.url,
      },
    });

    this.addOutputs({
      URL: site.url,
      BucketArn: site.bucketArn,
      BucketName: site.bucketName,
      DistributionId: site.distributionId,
      DistributionDomain: site.distributionDomain,
    });
  }
}
