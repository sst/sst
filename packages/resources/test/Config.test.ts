import { test, expect, beforeEach } from "vitest";
import {
  hasResource,
} from "./helper";
import {
  App,
  Stack,
  Config,
} from "../src";

beforeEach(async () => {
  Config.Parameter.clear();
  Config.Secret.clear();
});

/////////////////////////////
// Test constructor
////////////////////////////

test("Secret: name in use by another Secret", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  new Config.Secret(stack, "MY_CONFIG");
  expect(() => {
    new Config.Secret(stack2, "MY_CONFIG");
  }).toThrow(/Config MY_CONFIG already exists/);
});

test("Secret: name in use by another Parameter", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  new Config.Parameter(stack, "MY_CONFIG", {
    value: "my-value",
  });
  expect(() => {
    new Config.Secret(stack2, "MY_CONFIG");
  }).toThrow(/Config MY_CONFIG already exists/);
});

test("Secret: hasName", async () => {
  const stack = new Stack(new App(), "stack");
  new Config.Secret(stack, "MY_CONFIG");
  expect(Config.Secret.hasName("MY_CONFIG")).toBeTruthy();
  expect(Config.Secret.hasName("GARBAGE")).toBeFalsy();
});

test("Secret: getAllNames", async () => {
  const stack = new Stack(new App(), "stack");
  new Config.Secret(stack, "MY_CONFIG");
  expect(Config.Secret.getAllNames()).toEqual(["MY_CONFIG"]);
});

test("Parameter", async () => {
  const stack = new Stack(new App(), "stack");
  new Config.Parameter(stack, "MY_CONFIG", {
    value: "my-value",
  });
  hasResource(stack, "AWS::SSM::Parameter", {
    Type: "String",
    Name: "/sst/my-app/dev/parameters/MY_CONFIG",
    Value: "my-value",
  });
});

test("Parameter: hasName", async () => {
  const stack = new Stack(new App(), "stack");
  new Config.Parameter(stack, "MY_CONFIG", {
    value: "my-value",
  });
  expect(Config.Parameter.hasName("MY_CONFIG")).toBeTruthy();
  expect(Config.Parameter.hasName("GARBAGE")).toBeFalsy();
});

test("Parameter: getAllNames", async () => {
  const stack = new Stack(new App(), "stack");
  new Config.Parameter(stack, "MY_CONFIG", {
    value: "my-value",
  });
  expect(Config.Parameter.getAllNames()).toEqual(["MY_CONFIG"]);
});

test("Parameter: name in use by another Parameter", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  new Config.Parameter(stack, "MY_CONFIG", {
    value: "my-value",
  });
  expect(() => {
    new Config.Parameter(stack2, "MY_CONFIG", {
      value: "my-value",
    });
  }).toThrow(/Config MY_CONFIG already exists/);
});

test("Parameter: name in use by another Secret", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  new Config.Secret(stack, "MY_CONFIG");
  expect(() => {
    new Config.Parameter(stack2, "MY_CONFIG", {
      value: "my-value",
    });
  }).toThrow(/Config MY_CONFIG already exists/);
});