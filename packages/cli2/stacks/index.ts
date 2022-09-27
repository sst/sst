import { App, StackContext } from "@serverless-stack/resources";
import { Bucket } from "aws-cdk-lib/aws-s3";

function MyStack(ctx: StackContext) {
  // new Bucket(ctx.stack, "MyBucket");
  ctx.stack.addOutputs({
    VERSION: "5"
  });
}

export default function main(app: App) {
  app.stack(MyStack, { id: "MyStack1" });
}
