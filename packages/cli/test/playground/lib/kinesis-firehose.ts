import * as firehose from "@aws-cdk/aws-kinesisfirehose-alpha";
import * as firehoseDestinations from "@aws-cdk/aws-kinesisfirehose-destinations-alpha";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const bucket = new sst.Bucket(this, "Bucket");

    const stream = new firehose.DeliveryStream(this, "Delivery Stream", {
      destinations: [new firehoseDestinations.S3Bucket(bucket.s3Bucket)],
    });

    new sst.Function(this, "Fn", {
      handler: "src/lambda.main",
      permissions: [stream],
    });
  }
}
