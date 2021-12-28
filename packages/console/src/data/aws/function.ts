import {
  LambdaClient,
  GetFunctionCommand,
  InvokeCommand,
} from "@aws-sdk/client-lambda";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  FilterLogEventsResponse,
} from "@aws-sdk/client-cloudwatch-logs";
import { Buffer } from "buffer";
import { useInfiniteQuery, useMutation, useQuery } from "react-query";
import { useClient } from "./client";
import { Toast } from "~/components";

export function useFunctionQuery(arn: string) {
  const lambda = useClient(LambdaClient);
  return useQuery(["functions", arn], async () => {
    const result = await lambda.send(
      new GetFunctionCommand({
        FunctionName: arn,
      })
    );
    return result.Configuration!;
  });
}

export function useFunctionInvoke() {
  const lambda = useClient(LambdaClient);
  const toast = Toast.use();

  return useMutation({
    onError: () =>
      toast.create({
        type: "danger",
        text: "Failed to invoke lambda",
      }),
    mutationFn: async (opts: { arn: string; payload: any }) => {
      await lambda.send(
        new InvokeCommand({
          FunctionName: opts.arn,
          Payload: Buffer.from(JSON.stringify(opts.payload)),
        })
      );
    },
  });
}

type LogsOpts = {
  functionName: string;
};

export function useLogsQuery(opts: LogsOpts) {
  const cw = useClient(CloudWatchLogsClient);
  return useInfiniteQuery<FilterLogEventsResponse>({
    queryKey: ["logs", opts.functionName],
    queryFn: async (q) => {
      const logGroupName = `/aws/lambda/${opts.functionName}`;
      const resp = await cw.send(
        new FilterLogEventsCommand({
          logGroupName: logGroupName,
          interleaved: true,
          nextToken: q.pageParam,
          limit: 50,
        })
      );
      return resp;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.events?.length === 0) return undefined;
      return lastPage.nextToken;
    },
  });
}
