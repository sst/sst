import { createProxy, getVariables2 } from "../util/index.js";
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

export const Job = /* @__PURE__ */ (() => {
  const result = createProxy<JobType>("Job");
  const vars = getVariables2("Job");
  Object.keys(vars).forEach((name) => {
    // @ts-expect-error
    result[name] = JobControl(name as keyof JobResources, vars[name]);
  });
  return result;
})();

function JobControl<Name extends keyof JobResources>(
  name: Name,
  vars: Record<string, string>
) {
  return {
    async run(props: JobRunProps<Name>) {
      // Handle job permission not granted
      const functionName = vars.functionName;

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
 * declare module "sst/node/job" {
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
