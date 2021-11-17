import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const bucket = new sst.Bucket(this, "Bucket");

    this.addOutputs({
      BucketName: bucket.bucketName,
    });
  }
}
