import { expect, haveResource } from "@aws-cdk/assert";
import * as sst from "@serverless-stack/resources";
import %stack-name.PascalCased% from "../lib/%stack-name.PascalCased%";

test("Test Stack", () => {
  const app = new sst.App();
  // WHEN
  const stack = new %stack-name.PascalCased%(app, "test-stack");
  // THEN
  expect(stack).to(haveResource("AWS::Lambda::Function"));
});
