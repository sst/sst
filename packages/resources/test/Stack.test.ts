import * as cdk from "@aws-cdk/core";
import { expect as expectCdk, haveOutput } from "@aws-cdk/assert";
import { App, Stack } from "../src";

test("scope-Stage", async () => {
  const app = new App();
  const stage = new cdk.Stage(app, "stage");
  const stack = new Stack(stage, "stack");
  expect(app.stage).toBe("dev");
  expect(stack.stage).toBe("dev");
});

test("addOutputs", async () => {
  const stack = new Stack(new App(), "stack");
  stack.addOutputs({
    keyA: "valueA",
    keyB: { value: "valueB", exportName: "exportB" },
  });
  expectCdk(stack).to(
    haveOutput({
      outputName: "keyA",
      outputValue: "valueA",
    })
  );
  expectCdk(stack).to(
    haveOutput({
      outputName: "keyB",
      exportName: "exportB",
      outputValue: "valueB",
    })
  );
});

test("addOutputs-undefined-value", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    stack.addOutputs({
      // @ts-ignore: Test undefined value
      keyA: stack.abc,
    });
  }).toThrow(/The stack output "keyA" is undefined/);
});
