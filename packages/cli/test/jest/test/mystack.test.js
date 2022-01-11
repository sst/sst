import { Template } from "aws-cdk-lib/assertions";
import * as sst from "@serverless-stack/resources";
import MyStack from "../lib/mystack";

test("My Stack", () => {
  const app = new sst.App({ stage: "dev", region: "us-east-1" });
  // WHEN
  const stack = new MyStack(app, "MyTestStack");
  // THEN
  try {
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::DynamoDB::Table", {
        BillingMode: "PAY_PER_REQUEST",
    });
    // Print out a test string that parent jest.test.js can catch
    console.log("JESTTESTSUCCESS-----");
  } catch (e) {
    // Ignore any errors
  }
});
