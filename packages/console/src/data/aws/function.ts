import CloudWatchLogs from "aws-sdk/clients/cloudwatchlogs";
import Lambda from "aws-sdk/clients/lambda";
import { useQuery } from "react-query";
import { AWS_CREDENTIALS } from "./credentials";

const lambda = new Lambda({
  region: "us-east-2",
  credentials: AWS_CREDENTIALS,
  maxRetries: 0,
});

export function useFunctionQuery(arn: string) {
  return useQuery(["functions", arn], async () => {
    const result = await lambda
      .getFunction({
        FunctionName: arn,
      })
      .promise();
    return result.Configuration!;
  });
}

type LogsOpts = {
  functionName: string;
};

const cw = new CloudWatchLogs({
  region: "us-east-2",
  credentials: AWS_CREDENTIALS,
  maxRetries: 0,
});

export function useLogsQuery(opts: LogsOpts) {
  return useQuery(["logs", opts.functionName], async () => {
    const logGroupName = `/aws/lambda/${opts.functionName}`;
    const streams = await cw
      .describeLogStreams({
        logGroupName,
        orderBy: "LastEventTime",
      })
      .promise();
    const first = streams.logStreams?.[0];
    if (!first) return [];

    const resp = await cw
      .getLogEvents({
        logGroupName,
        logStreamName: first.logStreamName!,
        startFromHead: true,
      })
      .promise();
    return resp.events || [];
  });
}
