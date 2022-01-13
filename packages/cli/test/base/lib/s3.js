import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sst from "@serverless-stack/resources";

export default class S3Stack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const stage = this.node.root.stage;
    const service = this.node.root.name;

    this.bucket = new s3.Bucket(this, "uploads", {
      cors: [
        {
          allowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    // Export values
    new cdk.CfnOutput(this, "uploadsBucketArn", {
      exportName: `${stage}-${service}-ExtAttachmentsBucketArn`,
      value: this.bucket.bucketArn,
    });
    new cdk.CfnOutput(this, "uploadsBucketName", {
      exportName: `${stage}-${service}-ExtAttachmentsBucket`,
      value: this.bucket.bucketName,
    });
  }
}
