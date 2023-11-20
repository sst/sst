import { SSTConfig } from "sst";
import { Bucket } from "sst/constructs";
import { Tags } from "aws-cdk-lib";

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
      const b = new Bucket(ctx.stack, "MyBucket");
      Tags.of(b).add("foo", "1000");
    });
  },
} satisfies SSTConfig;
