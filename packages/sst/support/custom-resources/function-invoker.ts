import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { sdkLogger } from "./util.js";
const lambda = new LambdaClient({ logger: sdkLogger });

export async function FunctionInvoker(cfnRequest: any) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const { functionName } = cfnRequest.ResourceProperties;
      await invoke(functionName);
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function invoke(functionName: string) {
  console.log("invoke");

  try {
    await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
      })
    );
  } catch (e) {
    console.error(`failed to invoke`, e);
    // ignore error
  }
}
