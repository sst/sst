import { expect as expectCdk, haveOutput } from "@aws-cdk/assert";
import { App, Stack } from "../src";

test("cfnoutputs", async () => {
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
