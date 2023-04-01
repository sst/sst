import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { log, wrapper } from "./util.js";

const lambda = new LambdaClient({ logger: console });

export const handler = wrapper(async (cfnRequest: any) => {
  log("onEventHandler", cfnRequest);

  // Invoke user function on Create and on Update
  const fnCreate = cfnRequest.ResourceProperties.UserCreateFunction;
  const fnUpdate = cfnRequest.ResourceProperties.UserUpdateFunction;
  const fnDelete = cfnRequest.ResourceProperties.UserDeleteFunction;
  const fnParams = JSON.parse(cfnRequest.ResourceProperties.UserParams);
  if (cfnRequest.RequestType === "Create" && fnCreate) {
    await invokeUserFunction(fnCreate, { params: fnParams });
  } else if (cfnRequest.RequestType === "Update" && fnUpdate) {
    await invokeUserFunction(fnUpdate, { params: fnParams });
  } else if (cfnRequest.RequestType === "Delete" && fnDelete) {
    await invokeUserFunction(fnDelete, { params: fnParams });
  }
});

async function invokeUserFunction(functionName: string, payload: any) {
  log("invokeUserFunction()", functionName, payload);

  const resp = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
    })
  );
  if (resp.FunctionError) {
    const payload = JSON.parse(Buffer.from(resp.Payload!).toString());
    const error = new Error();
    // @ts-ignore
    error.reason = `${payload.errorType}: ${payload.errorMessage} - https://${
      process.env.AWS_REGION
    }.console.aws.amazon.com/cloudwatch/home?region=${
      process.env.AWS_REGION
    }#logsV2:log-groups/log-group/${encodeURIComponent(
      `/aws/lambda/${functionName}`
    )}`;
    throw error;
  }

  log(`response`, resp);
}
