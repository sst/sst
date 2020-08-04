import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import * as sst from "@serverless-stack/resources";
import { SampleStack } from "../lib/sample-stack";

test("SQS Queue Created", () => {
  const app = new sst.App({ stage: "dev", region: "us-east-1" });
  // WHEN
  const stack = new SampleStack(app, "MyTestStack");
  // THEN
  try {
    expectCDK(stack).to(
      haveResource("AWS::SQS::Queue", {
        VisibilityTimeout: 300,
      })
    );
  } catch (e) {
    // Print out a test string that parent jest.test.js can catch
    console.log("JESTTESTFAILED-----");
  }
});

test("SNS Topic Created", () => {
  const app = new sst.App({ stage: "dev", region: "us-east-1" });
  // WHEN
  const stack = new SampleStack(app, "MyTestStack");
  // THEN
  try {
    expectCDK(stack).to(haveResource("AWS::SNS::Topic"));
  } catch (e) {
    // Print out a test string that parent jest.test.js can catch
    console.log("JESTTESTFAILED-----");
  }
});
