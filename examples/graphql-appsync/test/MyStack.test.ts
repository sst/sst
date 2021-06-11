import { expect, haveResource } from "@aws-cdk/assert";
import * as sst from "@serverless-stack/resources";
import MyStack from "../lib/MyStack";

test("Test Stack", () => {
  const app = new sst.App();
  // WHEN
  const stack = new MyStack(app, "test-stack");
  // THEN
  expect(stack).to(haveResource("AWS::Lambda::Function"));
});
