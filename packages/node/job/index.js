import { createProxy, parseEnvironment } from "../util";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});
export const Job = createProxy("Job");
const jobData = parseEnvironment("Job", ["functionName"]);
Object.keys(jobData).forEach((name) => {
    // @ts-ignore
    Job[name] = JobControl(name);
});
function JobControl(name) {
    return {
        async run(props) {
            // Handle job permission not granted
            // @ts-ignore
            const functionName = jobData[name].functionName;
            // Invoke the Lambda function
            const ret = await lambda.send(new InvokeCommand({
                FunctionName: functionName,
                Payload: props?.payload === undefined
                    ? undefined
                    : Buffer.from(JSON.stringify(props?.payload)),
            }));
            if (ret.FunctionError) {
                throw new Error(`Failed to invoke the ${name} Job. Error: ${ret.FunctionError}`);
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
export function JobHandler(name, cb) {
    return function handler(event) {
        return cb(event);
    };
}
