import CloudWatchLogs from "aws-sdk/clients/cloudwatchlogs";
import Lambda from "aws-sdk/clients/lambda";
import { useInfiniteQuery, useQuery } from "react-query";
import { useService } from "./service";

export function useFunctionQuery(arn: string) {
  const lambda = useService(Lambda);
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

export function useLogsQuery(opts: LogsOpts) {
  const cw = useService(CloudWatchLogs);
  return useInfiniteQuery<CloudWatchLogs.GetLogEventsResponse>({
    queryKey: ["logs", opts.functionName],
    queryFn: async (q) => {
      const logGroupName = `/aws/lambda/${opts.functionName}`;
      const streams = await cw
        .describeLogStreams({
          logGroupName,
          orderBy: "LastEventTime",
        })
        .promise();
      const first = streams.logStreams?.[0];
      if (!first) throw new Error("No log streams found");

      const resp = await cw
        .filterLogEvents({
          logGroupName: logGroupName,
          interleaved: true,
          nextToken: q.pageParam,
          limit: 50,
        })
        .promise();
      return resp;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.events?.length === 0) return undefined;
      return lastPage.nextForwardToken;
    },
    getPreviousPageParam: (firstPage) => firstPage.nextBackwardToken,
  });
}
