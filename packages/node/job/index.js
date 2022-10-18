import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});
const ENV_PREFIX = "SST_Job_name_";
;
export const Job = new Proxy;
 > ({}, {
    get(target, prop, receiver) {
        if (!(prop in target)) {
            throw new Error(`Cannot use Job.${String(prop)}. Please make sure it is bound to this function.`);
        }
        return Reflect.get(target, prop, receiver);
    }
});
function JobControl(name) {
    return {
        async run(props) {
            // Handle job permission not granted
            const functionName = process.env[`${ENV_PREFIX}${name}`];
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
parseEnvironment();
function parseEnvironment() {
    Object.keys(process.env)
        .filter((key) => key.startsWith(ENV_PREFIX))
        .forEach((key) => {
        const name = envNameToTypeName(key);
        // @ts-ignore
        Api[name] = JobControl(name);
    });
}
function envNameToTypeName(envName) {
    return envName.replace(new RegExp(`^${ENV_PREFIX}`), "");
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
