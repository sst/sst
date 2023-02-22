import { createProxy, getVariables } from "../util/index.js";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});

export interface JobResources {}

export interface JobTypes {}

export type JobRunProps<T extends keyof JobResources> = {
  payload?: JobTypes[T];
};

// Note: create the JobType separately and passing into `createProxy`
//       instead of defining the type inline in `createProxy`. In the
//       latter case, the type is not available in the client.
export type JobType = {
  [T in keyof JobResources]: ReturnType<typeof JobControl<T>>;
};

export const Job = createProxy<JobType>("Job");
const jobData = await getVariables("Job");
Object.keys(jobData).forEach((name) => {
  // @ts-ignore
  Job[name] = JobControl(name);
});

function JobControl<Name extends keyof JobResources>(name: Name) {
  return {
    async run(props: JobRunProps<Name>) {
      // Handle job permission not granted
      // @ts-ignore
      const functionName = jobData[name].functionName;

      // Invoke the Lambda function
      const ret = await lambda.send(
        new InvokeCommand({
          FunctionName: functionName,
          Payload:
            props?.payload === undefined
              ? undefined
              : Buffer.from(JSON.stringify(props?.payload)),
        })
      );
      if (ret.FunctionError) {
        throw new Error(
          `Failed to invoke the ${name} Job. Error: ${ret.FunctionError}`
        );
      }
    },
  };
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
export function JobHandler<C extends keyof JobResources>(
  name: C,
  cb: (payload: JobTypes[C]) => void
) {
  return function handler(event: any) {
    return cb(event as JobTypes[keyof JobResources]);
  };
}
