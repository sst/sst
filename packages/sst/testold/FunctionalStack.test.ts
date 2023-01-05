import { describe, it, expect } from "vitest";
import { App, StackContext, use } from "../src";
import { dependsOn, getStack } from "../src/FunctionalStack";

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
  it("initialize multiple", () => {
    const template = new App().stack(StackA).stack(StackB).synth();
    expect(template.manifest.artifacts?.["dev-my-app-StackA"]).not.toBeNull();
    expect(template.manifest.artifacts?.["dev-my-app-StackB"]).not.toBeNull();
  });

  it("wrong order", () => {
    expect(() => {
      new App().stack(StackUse).stack(StackA).synth();
    }).toThrowError(/StackWrongOrder/);
  });

  it("duplicate stacks", () => {
    expect(() => {
      new App().stack(StackA).stack(StackA).synth();
    }).toThrowError(/StackDuplicates/);
  });

  it("async stack", async () => {
    const app = new App();
    await app.stack(StackAsync);
    const template = app.synth();
    expect(
      template.manifest.artifacts?.["dev-my-app-StackAsync"]
    ).not.toBeNull();
  });

  it("customize id", async () => {
    const app = new App().stack(StackA, {
      id: "custom",
    });
    expect(
      app.synth().manifest.artifacts?.["dev-my-app-custom"]
    ).not.toBeNull();
  });

  it("customize stack name", async () => {
    const app = new App().stack(StackA, {
      stackName: "my-app-dev-custom",
    });
    expect(
      app.synth().manifest.artifacts?.["my-app-dev-custom"]
    ).not.toBeNull();
  });

  it("getStack", () => {
    new App().stack(StackA).stack(StackB);
    const stack = getStack(StackA);
    expect(stack).not.toBeNull();
  });

  it("dependsOn", () => {
    const dependent = (_ctx: StackContext) => {
      dependsOn(StackA);
    };
    new App().stack(StackA).stack(dependent);
  });
});
