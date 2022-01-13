import { Template } from "aws-cdk-lib/assertions";
import * as sst from "@serverless-stack/resources";
import MyStack from "../lib/MyStack";

test("Test Stack", () => {
  const app = new sst.App();
  // WHEN
  const stack = new MyStack(app, "test-stack");
  // THEN
  try {
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::Lambda::Function", 1); 
    // Print out a test string that parent .test.js can catch
    console.log("JESTTESTSUCCESS-----");
  } catch (e) {
    // Ignore any errors
  }
});
