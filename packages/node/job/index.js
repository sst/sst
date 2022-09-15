import { Config } from "../config";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});
const JOB_PREFIX = "SST_JOB_";
;
async function run({ jobName, payload }) {
    // Handle job permission not granted
    let functionName;
    try {
        functionName = Config[`SST_JOB_${jobName}`];
    }
    catch (e) {
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
export function JobHandler(name, cb) {
    return function handler(event) {
        return cb(event);
    };
}
export const Job = {
    run,
    JobHandler,
};
