import { Config } from "../config";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});
const JOB_PREFIX = "SST_JOB_";

export interface JobNames { };

export interface JobTypes { }

export type JobProps = {
  [type in Extract<keyof JobTypes, keyof JobNames>]: {
    jobName: type;
    payload?: JobTypes[type];
  };
}[Extract<keyof JobTypes, keyof JobNames>];

async function run({ jobName, payload }: JobProps) {
  // Handle job permission not granted
  let functionName;
  try {
    functionName = Config[`SST_JOB_${jobName}`];
  } catch (e) {
    throw new Error(`Cannot invoke the ${jobName} Job. Please make sure this function has permissions to invoke it.`);
  }

  // Invoke the Lambda function
  await lambda.send(new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

/**
 * Create a new job handler.
 *
 * @example
 * ```ts
 * declare module "@serverless-stack/node/job" {
 *   export interface JobTypes {
 *     MyJob: {
 *       title: string;
 *     };
 *   }
 * }
 * 
 * export const handler = JobHandler("MyJob", async (payload) => {
 *   console.log(payload.title);
 * })
 * ```
 */
export function JobHandler<C>(name: keyof JobNames, cb: (payload: JobTypes[keyof JobNames]) => C) {
  return function handler(event: any) {
    return cb(event as JobTypes[keyof JobNames]);
  };
}

export const Job = {
  run,
  JobHandler,
};