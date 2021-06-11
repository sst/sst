import { EventType } from "@aws-cdk/aws-s3";
import { RemovalPolicy } from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a new bucket
    const bucket = new sst.Bucket(this, "Bucket", {
      s3Bucket: {
        // Delete all the files
        autoDeleteObjects: true,
        // Remove the bucket when the stack is removed
        removalPolicy: RemovalPolicy.DESTROY,
      },
      notifications: [
        {
          function: {
            handler: "src/resize.main",
            bundle: {
              externalModules: ["sharp"],
            },
            layers: [
              new lambda.LayerVersion(this, "SharpLayer", {
                code: lambda.Code.fromAsset("layers/sharp"),
              }),
            ],
          },
          notificationProps: {
            events: [EventType.OBJECT_CREATED],
          },
        },
      ],
    });

    // Allow the notification functions to access the bucket
    bucket.attachPermissions([bucket]);

    // Show the endpoint in the output
    this.addOutputs({
      BucketName: bucket.s3Bucket.bucketName,
    });
  }
}
