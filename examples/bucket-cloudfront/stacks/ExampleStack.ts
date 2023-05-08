import { Bucket, StackContext } from "sst/constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";

export default function ExampleStack({ stack }: StackContext) {
  const bucket = new Bucket(stack, "Bucket");

  const distribution = new cloudfront.Distribution(stack, "Distribution", {
    defaultBehavior: {
      origin: new cloudfrontOrigins.S3Origin(bucket.cdk.bucket),
    },
  });

  stack.addOutputs({
    URL: distribution.domainName,
  });
}
