import {
  expect as expectCdk,
  haveResource,
  ResourcePart,
} from "@aws-cdk/assert";
import { App, AppDeployProps, Auth, DeployProps, Stack } from "../src";
import { RemovalPolicy } from "@aws-cdk/core";

test("non-namespaced-props", async () => {
  const deployProps = {} as DeployProps;
  expect(deployProps).toBeDefined();
});

test("namespaced-props", async () => {
  const deployProps = {} as AppDeployProps;
  expect(deployProps).toBeDefined();
});

test("defaultRemovalPolicy", () => {
  const app = new App();
  app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);
  const stack = new Stack(app, "stack");
  new Auth(stack, "Auth", { cognito: true });
  expectCdk(stack).to(
    haveResource(
      "AWS::Cognito::UserPool",
      {
        DeletionPolicy: "Delete",
      },
      ResourcePart.CompleteDefinition
    )
  );
});
