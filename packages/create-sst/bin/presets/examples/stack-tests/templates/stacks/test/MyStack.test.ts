import { Template } from "aws-cdk-lib/assertions";
import { Util } from "@serverless-stack/core";
import { App, getStack } from "@serverless-stack/resources";
import main from "../index";
import { MyStack } from "../MyStack";
import { test } from "vitest";

test("Test timeout", () => {
  initApp("prod");
  const template = Template.fromStack(getStack(MyStack));
  template.hasResourceProperties("AWS::Lambda::Function", {
    Timeout: 20,
  });
});

test("Test environment variables", () => {
  initApp("prod");
  const template = Template.fromStack(getStack(MyStack));
  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: {
      Variables: {
        MY_ENV_VAR: "i-am-in-production",
      },
    },
  });
});

function initApp(stage: string) {
  // Load .env files
  // Note: `.env` and `.env.local` are loaded by default. You can
  //       provide additional files in `searchPaths`.
  Util.Environment.load({
    searchPaths: [`.env.${stage}.local`, `.env.${stage}`],
  });

  // Create App
  const app = new App({ stage });
  main(app);
}
