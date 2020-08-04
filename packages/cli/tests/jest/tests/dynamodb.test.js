import { expect, haveResource } from "@aws-cdk/assert";
import * as sst from "@serverless-stack/resources";
import DynamoDBStack from "../lib/dynamodb";

test("DynamoDB Stack", () => {
  const app = new sst.App({ stage: "dev", region: "us-east-1" });
  // WHEN
  const stack = new DynamoDBStack(app, "MyTestStack");
  // THEN
  try {
    expect(stack).to(
      haveResource("AWS::DynamoDB::Table", {
        BillingMode: "PAY_PER_REQUEST",
      })
    );
  } catch (e) {
    // Print out a test string that parent jest.test.js can catch
    console.log("JESTTESTFAILED-----");
  }
});
