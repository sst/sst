import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});

export interface RunProps {
  jobName: string;
  payload?: any;
};

async function run({ jobName, payload }: RunProps) {
  await lambda.send(new InvokeCommand({
    FunctionName: jobName,
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

export const Job = {
  run
};