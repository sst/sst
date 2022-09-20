import { Config } from "../config";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});
const JOB_PREFIX = "SST_JOB_";

export interface JobNames { };

export interface JobTypes { }

export type JobProps<C extends Extract<keyof JobTypes, keyof JobNames>> = {
  payload?: JobTypes[C];
};

async function run<C extends keyof JobNames>(name: C, props?: JobProps<C>) {
  // Handle job permission not granted
  let functionName;
  try {
    functionName = Config[`SST_JOB_${name}`];
  } catch (e) {
    throw new Error(`Cannot invoke the ${name} Job. Please make sure this function has permissions to invoke it.`);
  }

  // Invoke the Lambda function
  await lambda.send(new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(props?.payload)),
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
export function JobHandler<C extends keyof JobNames>(name: C, cb: (payload: JobTypes[C]) => void) {
  return function handler(event: any) {
    return cb(event as JobTypes[keyof JobNames]);
  };
}

export const Job = {
  run,
};