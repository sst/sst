import { describe, it, expect } from "vitest";
import { App, StackContext, use } from "../../dist/constructs";
import { dependsOn, getStack } from "../../dist/constructs/FunctionalStack.js";
import { createApp } from "./helper";

function StackA(_ctx: StackContext) {
  return { value: "a" };
}

function StackB(_ctx: StackContext) {
  return { value: "b" };
}

function StackUse(_ctx: StackContext) {
  use(StackA);
}

async function StackAsync(_ctx: StackContext) {
  return {};
}

describe("functional stack", () => {
  it("initialize multiple", async () => {
    const template = (await createApp()).stack(StackA).stack(StackB).synth();
    expect(template.manifest.artifacts?.["test-app-StackA"]).not.toBeNull();
    expect(template.manifest.artifacts?.["test-app-StackB"]).not.toBeNull();
  });

  it("wrong order", async () => {
    await expect(async () => {
      (await createApp()).stack(StackUse).stack(StackA).synth();
    }).rejects.toThrowError(/StackWrongOrder/);
  });

  it("duplicate stacks", async () => {
    await expect(async () => {
      (await createApp()).stack(StackA).stack(StackA).synth();
    }).rejects.toThrowError(/StackDuplicates/);
  });

  it("async stack", async () => {
    const app = await createApp();
    await app.stack(StackAsync);
    const template = app.synth();
    expect(template.manifest.artifacts?.["test-app-StackAsync"]).not.toBeNull();
  });

  it("customize id", async () => {
    const app = (await createApp()).stack(StackA, {
      id: "custom",
    });
    expect(app.synth().manifest.artifacts?.["test-app-custom"]).not.toBeNull();
  });

  it("customize stack name", async () => {
    const app = (await createApp()).stack(StackA, {
      stackName: "app-test-custom",
    });
    expect(app.synth().manifest.artifacts?.["app-test-custom"]).not.toBeNull();
  });

  it("getStack", async () => {
    (await createApp()).stack(StackA).stack(StackB);
    const stack = getStack(StackA);
    expect(stack).not.toBeNull();
  });

  it("dependsOn", async () => {
    const dependent = (_ctx: StackContext) => {
      dependsOn(StackA);
    };
    (await createApp()).stack(StackA).stack(dependent);
  });
});
