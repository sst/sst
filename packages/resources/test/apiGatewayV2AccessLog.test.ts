import { cleanupLogGroupName } from "../src/util/apiGatewayV2AccessLog";

test("default", async () => {
  expect(cleanupLogGroupName("/aws/$default/$abc")).toEqual("/aws/default/abc");
});
