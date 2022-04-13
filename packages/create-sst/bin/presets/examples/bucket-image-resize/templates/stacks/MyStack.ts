import { Bucket, StackContext } from "@serverless-stack/resources";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function MyStack({ stack }: StackContext) {
  // Create a new bucket
  const bucket = new Bucket(stack, "Bucket", {
    notifications: {
      resize: {
        function: {
          handler: "src/resize.main",
          bundle: {
            externalModules: ["sharp"],
          },
          layers: [
            new lambda.LayerVersion(stack, "SharpLayer", {
              code: lambda.Code.fromAsset("layers/sharp"),
            }),
          ],
        },
        events: ["object_created"],
      },
    },
  });

  // Allow the notification functions to access the bucket
  bucket.attachPermissions([bucket]);

  // Show the endpoint in the output
  stack.addOutputs({
    BucketName: bucket.bucketName,
  });
}
