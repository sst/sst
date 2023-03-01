import { Template } from "aws-cdk-lib/assertions";
import { initProject } from "sst/project.js";
import { App, getStack } from "sst/constructs";
import { ExampleStack } from "../ExampleStack";
import { test } from "vitest";

test("Test timeout", async () => {
  await initProject({ stage: "prod" });
  const app = new App({ stage: "prod", mode: "deploy" });
  app.stack(ExampleStack);
  const template = Template.fromStack(getStack(ExampleStack));
  template.hasResourceProperties("AWS::Lambda::Function", {
    Timeout: 20,
  });
});
