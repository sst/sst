import * as sst from "@serverless-stack/resources";

export function CertStack({ stack }: sst.StackContext) {
  const bucket = new sst.Bucket(stack, "Bucket", {
    cdk: {
      bucket: {
        publicReadAccess: true,
      },
    },
  });

  new sst.Cron(stack, "Cron", {
    schedule: "rate(1 day)",
    job: {
      function: {
        srcPath: "src/",
        handler: "lambda.handler",
        runtime: "python3.8",
        timeout: 300,
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
        permissions: [
          bucket,
          "route53:ListHostedZones",
          "route53:GetChange",
          "route53:ChangeResourceRecordSets",
        ],
      },
    },
  });

  stack.addOutputs({
    BUCKET_NAME: bucket.bucketName,
  });
}
