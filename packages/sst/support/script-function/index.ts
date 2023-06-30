import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { log, wrapper } from "./util.js";

const logger = { ...console, debug: () => {} };
const lambda = new LambdaClient({ logger });
const cf = new CloudFormationClient({ logger });

export const handler = wrapper(async (cfnRequest: any) => {
  log("onEventHandler", cfnRequest);

  const { RequestType, ResourceProperties, StackId } = cfnRequest;

  // Do not invoke user function if stack is rolling back
  if (StackId && (await isStackRollingBack(StackId))) return;

  // Invoke user function on Create and on Update
  const fnCreate = ResourceProperties.UserCreateFunction;
  const fnUpdate = ResourceProperties.UserUpdateFunction;
  const fnDelete = ResourceProperties.UserDeleteFunction;
  const fnParams = JSON.parse(ResourceProperties.UserParams);
  if (RequestType === "Create" && fnCreate) {
    await invokeUserFunction(fnCreate, { params: fnParams });
  } else if (RequestType === "Update" && fnUpdate) {
    await invokeUserFunction(fnUpdate, { params: fnParams });
  } else if (RequestType === "Delete" && fnDelete) {
    await invokeUserFunction(fnDelete, { params: fnParams });
  }
});

async function isStackRollingBack(stackId: string) {
  log("isStackRollingBack()", stackId);

  const resp = await cf.send(
    new DescribeStacksCommand({
      StackName: stackId,
    })
  );
  const status = resp.Stacks?.[0].StackStatus;
  const isRollback =
    status?.startsWith("UPDATE_ROLLBACK") || status?.startsWith("ROLLBACK");

  log({ isRollback });

  return isRollback;
}

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
