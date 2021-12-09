import {
  expect as expectCdk,
  haveResource,
  anything,
  ResourcePart,
} from "@aws-cdk/assert";
import {
  App,
  AppDeployProps,
  Api,
  Auth,
  DeployProps,
  Stack,
  Function as Fn,
} from "../src";
import { RemovalPolicy } from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";

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

test("defaultRemovalPolicy bucket", () => {
  const app = new App();
  app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);
  const stack = new Stack(app, "stack");
  new Bucket(stack, "Bucket");
  expectCdk(stack).to(haveResource("Custom::S3AutoDeleteObjects", {}));
});

test("stackName is default", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(stack.stackName).toBe("dev-my-app-stack");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("stackName is parameterized", () => {
  const app = new App();
  const stack = new Stack(app, "stack", {
    stackName: "my-app-dev-stack",
  });
  expect(stack.stackName).toBe("my-app-dev-stack");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("stackName is not parameterized", () => {
  const app = new App();
  new Stack(app, "stack", {
    stackName: "my-stack",
  });
  expect(() => {
    app.synth();
  }).toThrow(
    /Stack "my-stack" is not parameterized with the stage name. The stack name needs to either start with "\$stage-", end in "-\$stage", or contain the stage name "-\$stage-"./
  );
});

test("stack tags", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  app.synth();
  expect(stack.tags.tagValues()).toEqual({
    "sst:app": "my-app",
    "sst:stage": "dev",
  });
});

test("metadata", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  new Fn(stack, "Function", {
    handler: "test/lambda.handler",
  });
  app.synth();
  expectCdk(stack).to(
    haveResource(
      "AWS::CDK::Metadata",
      {
        Metadata: {
          "sst:version": anything(),
          "sst:constructs": [
            {
              type: "Api",
              name: "Api",
              addr: "c8b18bd5e340154849baca2ae520b42c1694e2bc64",
              httpApiId: {
                Ref: "ApiCD79AAA0",
              },
            },
            {
              type: "ApiRoute",
              parentAddr: "c8b18bd5e340154849baca2ae520b42c1694e2bc64",
              route: "GET /",
              functionArn: {
                "Fn::GetAtt": ["ApiLambdaGETB1714EF3", "Arn"],
              },
            },
            {
              type: "Function",
              name: "Function",
              functionArn: {
                "Fn::GetAtt": ["Function76856677", "Arn"],
              },
            },
          ],
        },
      },
      ResourcePart.CompleteDefinition
    )
  );
});

test("metadata: Function used in Api should not be in metadata", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Fn(stack, "Function", {
    handler: "test/lambda.handler",
  });
  new Api(stack, "Api", {
    routes: {
      "GET /": f,
    },
  });
  app.synth();
  expectCdk(stack).to(
    haveResource(
      "AWS::CDK::Metadata",
      {
        Metadata: {
          "sst:version": anything(),
          "sst:constructs": [
            {
              type: "Api",
              name: "Api",
              addr: "c8b18bd5e340154849baca2ae520b42c1694e2bc64",
              httpApiId: {
                Ref: "ApiCD79AAA0",
              },
            },
            {
              type: "ApiRoute",
              parentAddr: "c8b18bd5e340154849baca2ae520b42c1694e2bc64",
              route: "GET /",
              functionArn: {
                "Fn::GetAtt": ["Function76856677", "Arn"],
              },
            },
          ],
        },
      },
      ResourcePart.CompleteDefinition
    )
  );
});
