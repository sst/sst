import { SSTConfig } from "sst";
import { CfnBucket } from "aws-cdk-lib/aws-s3";

export default {
  config() {
    return {
      name: "test",
      region: "us-east-1",
      profile: "sst-dev",
    };
  },
  stacks(app) {
    app.stack(function Default(ctx) {
      // const b = new CfnBucket(ctx.stack, "MyBucket");
      ctx.stack.addOutputs({
        // url: b.attrDomainName,
      });
    });
  },
} satisfies SSTConfig;
