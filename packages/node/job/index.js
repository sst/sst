import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const lambda = new LambdaClient({});
;
async function run({ jobName, payload }) {
    await lambda.send(new InvokeCommand({
        FunctionName: jobName,
        Payload: Buffer.from(JSON.stringify(payload)),
    }));
}
export const Job = {
    run
};
