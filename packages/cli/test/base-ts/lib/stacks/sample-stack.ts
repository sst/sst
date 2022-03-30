import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as sst from "@serverless-stack/resources";

export class SampleStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    new ssm.StringParameter(this, "Param", {
      stringValue: "Foo",
    });

    new s3.Bucket(this, "sample-bucket", {
      publicReadAccess: true,
    });
  }
}
