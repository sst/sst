import { Template } from "aws-cdk-lib/assertions";
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
  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::Lambda::Function", 1);
});
