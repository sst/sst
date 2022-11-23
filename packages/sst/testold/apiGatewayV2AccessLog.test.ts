import { cleanupLogGroupName } from "../src/util/apiGatewayV2AccessLog";
import { test, expect } from "vitest";

test("default", async () => {
  expect(cleanupLogGroupName("/aws/$default/$abc")).toEqual("/aws/default/abc");
});
