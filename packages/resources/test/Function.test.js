const lambda = require("@aws-cdk/aws-lambda");
const sst = require("../src");

test("function-xray-default", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const func = new sst.Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(func.node.defaultChild.tracingConfig.mode).toMatch('Active');
});

test("function-xray-disabled", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const func = new sst.Function(stack, "Function", {
    handler: "test/lambda.handler",
    tracing: lambda.Tracing.DISABLED,
  });
  expect(func.node.defaultChild.tracingConfig).toBeUndefined();
});

