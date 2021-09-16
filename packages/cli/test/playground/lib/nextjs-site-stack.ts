import * as sst from "@serverless-stack/resources";

interface NextjsSiteStackProps extends sst.StackProps {
  readonly api: sst.Api;
}

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props: NextjsSiteStackProps) {
    super(scope, id, props);

    const site = new sst.NextjsSite(this, "NextJsApp", {
      customDomain: {
        domainName: "next.sst.sh",
        domainAlias: "www.next.sst.sh",
        hostedZone: "sst.sh",
      },
      path: "src/sites/nextjs",
      environment: {
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
