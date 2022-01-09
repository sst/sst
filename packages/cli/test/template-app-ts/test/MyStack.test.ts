import { expect, haveResource }from "aws-lib-cdk/assert";
import * as sst from "@serverless-stack/resources";
import MyStack from "../lib/MyStack";

test("Test Stack", () => {
  const app = new sst.App();
  // WHEN
  const stack = new MyStack(app, "test-stack");
  // THEN
  try {
    expect(stack).to(haveResource("AWS::Lambda::Function"));
    // Print out a test string that parent .test.js can catch
    console.log("JESTTESTSUCCESS-----");
  } catch (e) {
    // Ignore any errors
  }
});
