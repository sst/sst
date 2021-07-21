import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // React
    const site = new sst.ReactStaticSite(this, "Frontend", {
      path: "src/sites/react-app",
      environment: {
        REACT_APP_API_URL: props.api.url,
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
