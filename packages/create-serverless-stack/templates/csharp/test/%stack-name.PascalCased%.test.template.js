import { expect, haveResource } from "@aws-cdk/assert";
import * as sst from "@serverless-stack/resources";
import %stack-name.PascalCased% from "../stacks/%stack-name.PascalCased%";

test("Test Stack", () => {
  const app = new sst.App();
  app.setDefaultFunctionProps({
    runtime: "dotnetcore3.1"
  });
  // WHEN
  const stack = new %stack-name.PascalCased%(app, "test-stack");
  // THEN
  expect(stack).to(haveResource("AWS::Lambda::Function"));
});
