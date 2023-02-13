import { Bucket, StackContext } from "sst/constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function ExampleStack({ stack }: StackContext) {
  // Create a new bucket
  const bucket = new Bucket(stack, "Bucket", {
    notifications: {
      resize: {
        function: {
          handler: "packages/functions/src/resize.main",
          nodejs: {
            esbuild: {
              externalModules: ["sharp"],
            },
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
