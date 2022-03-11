import { Template } from "aws-cdk-lib/assertions";
import * as sst from "@serverless-stack/resources";
import { SampleStack } from "../lib/sample-stack";

test("SQS Queue Created", () => {
  const app = new sst.App({ stage: "dev", region: "us-east-1" });
  // WHEN
  const stack = new SampleStack(app, "MyTestStack");
  // THEN
  try {
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::SQS::Queue", {
      VisibilityTimeout: 300,
    });
    // Print out a test string that parent jest.test.js can catch
    console.log("JESTTESTSUCCESS1-----");
  } catch (e) {
    // Ignore any errors
  }
});

test("SNS Topic Created", () => {
  const app = new sst.App({ stage: "dev", region: "us-east-1" });
  // WHEN
  const stack = new SampleStack(app, "MyTestStack");
  // THEN
  try {
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::SNS::Topic", 1);
    // Print out a test string that parent jest.test.js can catch
    console.log("JESTTESTSUCCESS2-----");
  } catch (e) {
    // Ignore any errors
  }
});
