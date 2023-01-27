import { Bucket, StackContext } from "@serverless-stack/resources";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";

export default function MyStack({ stack }: StackContext) {
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
