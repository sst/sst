/* eslint-disable */
import {
  LambdaClient,
  GetFunctionCommand,
  InvokeCommand,
} from "@aws-sdk/client-lambda";
import {
  CloudWatchLogsClient,
  FilteredLogEvent,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { concat, filter, map, pipe, sortBy, uniqBy } from "remeda";
import { Buffer } from "buffer";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useClient } from "./client";
import { Toast } from "~/components";
import { useMemo } from "react";

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
  arn: string;
};

export type Invocation = {
  logs: Log[];
  requestId?: string;
  logStream?: string;
  firstLineTime?: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
  billedDuration?: number;
  initDuration?: number;
  memSize?: number;
  memUsed?: number;
  xrayTraceId?: string;
  status: "SUCCESS" | "ERROR" | "UNKNOWN";
};
export type Log = {
  id: string;
  message: string;
  timestamp: number;
  level?: "INFO" | "WARN" | "ERROR" | "START" | "END" | "REPORT";
  requestId?: string;
  logStream: string;
  invocationMetadata: {
    duration?: number;
    billedDuration?: number;
    initDuration?: number;
    memSize?: number;
    memUsed?: number;
    xrayTraceId?: string;
    isFailed?: boolean;
  };
};

export function useLogsQuery(opts: LogsOpts) {
  const fn = useFunctionQuery(opts.arn);
  const cw = useClient(CloudWatchLogsClient);
  const queryClient = useQueryClient();
  const resp = useQuery({
    queryKey: ["logs", opts.arn],
    enabled: fn.data?.FunctionName !== undefined,
    queryFn: async () => {
      // Fetch logs
      const logGroupName = `/aws/lambda/${fn.data?.FunctionName}`;
      const response = await cw.send(
        new FilterLogEventsCommand({
          logGroupName: logGroupName,
          interleaved: true,
          startTime: Date.now() - 60000,
          limit: 10000,
        })
      );
      const next = response.events || [];
      const previous =
        queryClient.getQueryData<FilteredLogEvent[]>(["logs", opts.arn]) || [];

      return pipe(
        previous,
        concat(next),
        filter((event) => event != null),
        uniqBy((event) => event!.eventId)
      );
    },
    getNextPageParam: () => true,
    refetchInterval: 3000,
  });

  const invocations = useMemo(() => {
    console.log("Found new cw events");
    if (!fn.data?.Runtime) {
      return [];
    }

    const logs = pipe(
      resp.data || [],
      sortBy((event) => `${event?.logStreamName}-${event?.eventId}`),
      map((event) => parseLogMetadata(event, fn.data?.Runtime!))
    );
    return groupLogs(logs, fn.data?.Runtime!);
  }, [resp.data?.length]);
  return { data: invocations, query: resp, region: cw.config.region };
}

function parseLogMetadata(event: FilteredLogEvent, runtime: string) {
  const log: Log = {
    id: event.eventId!,
    message: event.message!.trim(),
    timestamp: event.timestamp!,
    logStream: event.logStreamName!,
    invocationMetadata: {},
  };

  try {
    log.level ||
      parseLambdaSTART(log) ||
      parseLambdaEND(log) ||
      parseLambdaREPORT(log);

    const spcParts = log.message.split(" ");

    log.level ||
      parseLambdaUnknownApplicationError(log) ||
      parseLambdaModuleInitializationError(log) ||
      parseLambdaExited(log, spcParts) ||
      parseLambdaTimeoutOrMessage(log, spcParts);

    const tabParts = log.message.split("\t");

    ///////////////////
    // Node Errors
    ///////////////////
    if (runtime.startsWith("nodejs")) {
      log.level || parseLambdaNodeLog(log, tabParts);
    }

    ///////////////////
    // Python Errors
    ///////////////////
    if (runtime.startsWith("python")) {
      log.level ||
        parseLambdaPythonLog(log, tabParts) ||
        parseLambdaPythonTraceback(log);
    }
  } catch (e) {
    console.log(e);
  }

  // Did not match any pattern
  if (!log.level) {
    log.level = "INFO";
  }

  return log;
}
function parseLambdaSTART(log: Log) {
  // START RequestId: 184b0c52-84d2-4c63-b4ef-93db5bb2189c Version: $LATEST
  if (log.message.startsWith("START RequestId: ")) {
    log.level = "START";
    log.requestId = log.message.substr(17, 36);
  }
}
function parseLambdaEND(log: Log) {
  // END RequestId: 184b0c52-84d2-4c63-b4ef-93db5bb2189c
  if (log.message.startsWith("END RequestId: ")) {
    log.level = "END";
    log.requestId = log.message.substr(15, 36);
  }
}
function parseLambdaREPORT(log: Log) {
  // REPORT RequestId: 6cbfe426-927b-43a3-b7b6-a525a3fd2756	Duration: 2.63 ms	Billed Duration: 100 ms	Memory Size: 1024 MB	Max Memory Used: 58 MB	Init Duration: 2.22 ms
  if (log.message.startsWith("REPORT RequestId: ")) {
    log.level = "REPORT";
    log.requestId = log.message.substr(18, 36);
    log.invocationMetadata = log.invocationMetadata || {};

    log.message.split("\t").forEach((part) => {
      part = part.trim();
      if (part.startsWith("Duration")) {
        log.invocationMetadata.duration = parseInt(part.split(" ")[1]);
      } else if (part.startsWith("Init Duration")) {
        log.invocationMetadata.initDuration = parseInt(part.split(" ")[2]);
      } else if (part.startsWith("Billed Duration")) {
        log.invocationMetadata.billedDuration = parseInt(part.split(" ")[2]);
      } else if (part.startsWith("Memory Size")) {
        log.invocationMetadata.memSize = parseInt(part.split(" ")[2]);
      } else if (part.startsWith("Max Memory Used")) {
        log.invocationMetadata.memUsed = parseInt(part.split(" ")[3]);
      } else if (part.startsWith("XRAY TraceId")) {
        log.invocationMetadata.xrayTraceId = part.split(" ")[2];
      }
    });
  }
}
function parseLambdaTimeoutOrMessage(log: Log, spcParts: string[]) {
  // 2018-01-05T23:48:40.404Z f0fc759e-f272-11e7-87bd-577699d45526 hello
  // 2018-01-05T23:48:40.404Z f0fc759e-f272-11e7-87bd-577699d45526 Task timed out after 6.00 seconds
  if (
    spcParts.length >= 3 &&
    spcParts[0].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !==
      null &&
    spcParts[1].match(/^[0-9a-fA-F-]{36}$/) !== null
  ) {
    const message = spcParts.slice(2).join(" ");
    const isFailed = message.startsWith("Task timed out after");
    log.requestId = spcParts[1];
    log.level = isFailed ? "ERROR" : "INFO";
    log.message = message;
    log.invocationMetadata = log.invocationMetadata || {};
    log.invocationMetadata.isFailed =
      log.invocationMetadata.isFailed || isFailed;
  }
}
function parseLambdaExited(log: Log, spcParts: string[]) {
  // - Nodejs, Python 3.8
  // RequestId: 80925099-25b1-4a56-8f76-e0eda7ebb6d3 Error: Runtime exited with error: signal: aborted (core dumped)
  // - Python 2.7, 3.6, 3.7
  // RequestId: 80925099-25b1-4a56-8f76-e0eda7ebb6d3 Process exited before completing request
  if (
    spcParts.length >= 3 &&
    spcParts[0] === "RequestId:" &&
    spcParts[1].match(/^[0-9a-fA-F-]{36}$/) !== null
  ) {
    const message = spcParts.slice(2).join(" ");
    log.requestId = spcParts[1];
    log.level = "ERROR";
    log.message = message;
    log.invocationMetadata = log.invocationMetadata || {};
    log.invocationMetadata.isFailed = true;
  }
}
function parseLambdaUnknownApplicationError(log: Log) {
  // Unknown application error occurred
  if (log.message.startsWith("Unknown application error occurred")) {
    log.level = "ERROR";
    log.invocationMetadata = log.invocationMetadata || {};
    log.invocationMetadata.isFailed = true;
  }
}
function parseLambdaModuleInitializationError(log: Log) {
  // module initialization error
  if (log.message.startsWith("module initialization error")) {
    log.level = "ERROR";
    log.invocationMetadata = log.invocationMetadata || {};
    log.invocationMetadata.isFailed = true;
  }
}
function parseLambdaNodeLog(log: Log, tabParts: string[]) {
  // - Nodejs 8.10
  // 2019-11-12T20:00:30.183Z	cc81b998-c7de-46fb-a9ef-3423ccdcda98	log hello
  // - Nodejs 10.x
  // 2019-11-12T20:00:30.183Z	cc81b998-c7de-46fb-a9ef-3423ccdcda98	INFO	log hello
  // 2019-11-12T20:00:30.184Z	cc81b998-c7de-46fb-a9ef-3423ccdcda98	WARN	warn hello
  // 2019-11-12T20:00:30.184Z	cc81b998-c7de-46fb-a9ef-3423ccdcda98	ERROR	error hello
  // 2019-11-12T20:15:19.686Z	77c628d3-d6cf-4643-88ac-bc9520ed3858	ERROR	Invoke Error
  // {
  //     "errorType": "ReferenceError",
  //     "errorMessage": "b is not defined",
  //     "stack": [
  //         "ReferenceError: b is not defined",
  //         "    at Runtime.module.exports.main [as handler] (/var/task/handler.js:9:15)",
  //         "    at Runtime.handleOnce (/var/runtime/Runtime.js:66:25)"
  //     ]
  // }
  // 2019-11-12T20:45:05.363Z	undefined	ERROR	Uncaught Exception
  // {
  //     "errorType": "ReferenceError",
  //     "errorMessage": "bad is not defined",
  //     "stack": [
  //         "ReferenceError: bad is not defined",
  //         "    at Object.<anonymous> (/var/task/handler.js:1:1)",
  //         "    at Module._compile (internal/modules/cjs/loader.js:778:30)",
  //     ]
  // }
  if (
    tabParts.length >= 3 &&
    tabParts[0].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !== null
  ) {
    // parse request id
    log.requestId =
      tabParts[1].match(/^[0-9a-fA-F-]{36}$/) !== null
        ? tabParts[1]
        : undefined;
    let level;
    // parse level
    if (tabParts[2] === "INFO") {
      log.level = "INFO";
      log.message = tabParts.slice(3).join("\t");
    } else if (tabParts[2] === "WARN") {
      log.level = "WARN";
      log.message = tabParts.slice(3).join("\t");
    } else if (tabParts[2] === "ERROR") {
      const errorName = tabParts[3].trim();
      const isLambdaFailed =
        errorName === "Invoke Error" ||
        errorName === "Uncaught Exception" ||
        errorName === "Unhandled Promise Rejection";
      log.level = "ERROR";
      log.message = tabParts.slice(3).join("\t");
      // parse JSON field for Lambda errors
      if (isLambdaFailed && tabParts.length === 5) {
        try {
          log.message = [
            tabParts[3],
            JSON.stringify(JSON.parse(tabParts[4]), null, 2),
          ].join("\n");
        } catch (e) {}
      }
      log.invocationMetadata = log.invocationMetadata || {};
      log.invocationMetadata.isFailed =
        log.invocationMetadata.isFailed || isLambdaFailed;
    } else {
      log.level = "INFO";
      log.message = tabParts.slice(2).join("\t");
    }
  }
}
function parseLambdaPythonLog(log: Log, tabParts: string[]) {
  // [WARNING] 2019-11-12T20:00:30.183Z	cc81b998-c7de-46fb-a9ef-3423ccdcda98 this is a warn
  // [ERROR] 2019-11-12T20:00:30.184Z	cc81b998-c7de-46fb-a9ef-3423ccdcda98 this is an error
  // [CRITICAL] 2019-11-12T20:00:30.184Z	cc81b998-c7de-46fb-a9ef-3423ccdcda98 this is critical
  if (
    tabParts.length >= 4 &&
    tabParts[1].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/) !==
      null &&
    tabParts[2].match(/^[0-9a-fA-F-]{36}$/) !== null
  ) {
    log.requestId = tabParts[2];
    // parse level
    if (tabParts[0] === "[INFO]") {
      log.level = "INFO";
    } else if (tabParts[0] === "[WARNING]") {
      log.level = "WARN";
    } else if (tabParts[0] === "[ERROR]" || tabParts[0] === "[CRITICAL]") {
      log.level = "ERROR";
    } else {
      log.level = "INFO";
    }
    log.message = `${tabParts[0]} ${tabParts.slice(3).join("\t")}`;
  }
}
function parseLambdaPythonTraceback(log: Log) {
  // ...  Traceback (most recent call last): ...
  if (log.message.match(/\sTraceback \(most recent call last\):\s/) !== null) {
    log.level = "ERROR";
    log.invocationMetadata = log.invocationMetadata || {};
  }
}

function groupLogs(logs: Log[], runtime: string) {
  // 5 types of logs:
  // - has START has REPORT => complete invocation
  // - has START no REPORT => incomplete invocation
  // - no START has REPORT => incomplete invocation
  // - no START no REPORT => incomplete invocation
  // - no START no REPORT and between invocations => (error message between requests)

  // Group logs into invocation
  const invocations: Invocation[] = [];
  const defaultStatus = runtime.startsWith("nodejs") ? "SUCCESS" : "UNKNOWN";
  let currentInvocation: Invocation = {
    logs: [],
    status: defaultStatus,
  };

  logs.forEach((log: Log) => {
    // Logs from a different stream => mark start of a new invocation
    if (log.logStream !== currentInvocation.logStream) {
      currentInvocation.logs.length > 0 && invocations.push(currentInvocation);
      currentInvocation = { logs: [], status: defaultStatus };
    }
    // After receiving the REPORT log from the current invocation, we don't
    // want to cutoff the invocation right away. In the case of timeout,
    // more logs with the same request id will come after the REPORT log.
    // But if log come after the REPORT log has a different or undefined
    // requestId, we will cutoff the current invocation.
    if (
      currentInvocation.endTime &&
      log.requestId !== currentInvocation.requestId
    ) {
      currentInvocation.logs.length > 0 && invocations.push(currentInvocation);
      currentInvocation = { logs: [], status: defaultStatus };
    }

    if (log.level === "START") {
      currentInvocation.logs.length > 0 && invocations.push(currentInvocation);
      currentInvocation = { logs: [], status: defaultStatus };
      currentInvocation.logs.push(log);
      currentInvocation.requestId = log.requestId;
      currentInvocation.logStream = log.logStream;
      currentInvocation.firstLineTime = log.timestamp;
      currentInvocation.startTime = log.timestamp;
    } else if (log.level === "REPORT") {
      currentInvocation.logs.push(log);
      currentInvocation.requestId =
        currentInvocation.requestId || log.requestId;
      currentInvocation.logStream = log.logStream;
      currentInvocation.firstLineTime =
        currentInvocation.firstLineTime || log.timestamp;
      currentInvocation.endTime = log.timestamp;
      currentInvocation.duration = log.invocationMetadata?.duration;
      currentInvocation.initDuration = log.invocationMetadata?.initDuration;
      currentInvocation.billedDuration = log.invocationMetadata?.billedDuration;
      currentInvocation.memSize = log.invocationMetadata?.memSize;
      currentInvocation.memUsed = log.invocationMetadata?.memUsed;
      currentInvocation.xrayTraceId = log.invocationMetadata?.xrayTraceId;
    } else {
      currentInvocation.logs.push(log);
      currentInvocation.requestId =
        currentInvocation.requestId || log.requestId;
      currentInvocation.logStream = log.logStream;
      currentInvocation.firstLineTime =
        currentInvocation.firstLineTime || log.timestamp;
      currentInvocation.status =
        log.invocationMetadata.isFailed === true
          ? "ERROR"
          : currentInvocation.status;
    }
  });

  currentInvocation.logs.length > 0 && invocations.push(currentInvocation);

  return invocations
    .filter((invocation) => invocation.startTime)
    .sort(
      (a: Invocation, b: Invocation) => b.firstLineTime! - a.firstLineTime!
    );
}

function mockLogEvents() {
  // most recent logs at the bottom
  const messages: string[] = [];
  [
    mockErrorInit,
    mockErrorTimeout,
    mockErrorThrown,
    mockNoEnd,
    mockNoStart,
    mockLongJSONSummary,
    mockLogLevels,
    mockDefault,
  ].forEach((mockFn, i) => {
    const reqId = `${i}`.padStart(12, "0");
    messages.push(...mockFn(reqId));
  });

  // Build log object
  const ts = Date.now() - messages.length * 1000;
  return messages.map((message, i) => ({
    eventId: `366564888943019255673637982628033313325854${ts + i * 1000}`,
    ingestionTime: ts + i * 1000,
    logStreamName: "2022/02/01/[$LATEST]3b66f77bc3f24fee8ccd70dd7315144e",
    message,
    timestamp: ts + i * 1000,
  }));
}
function mockDefault(reqId: string) {
  return [
    `START RequestId: 18269d91-6b89-4021-8b58-${reqId} Version: $LATEST\n`,
    `2022-02-01T16:43:31.048Z\t18269d91-6b89-4021-8b58-${reqId}\tINFO\tsendMessage() - send request\n`,
    `END RequestId: 18269d91-6b89-4021-8b58-${reqId}\n`,
    `REPORT RequestId: 18269d91-6b89-4021-8b58-${reqId}\tDuration: 509.89 ms\tBilled Duration: 510 ms\tMemory Size: 1024 MB\tMax Memory Used: 80 MB\t\nXRAY TraceId: 1-61f96332-54eba86c47245db57214005f\tSegmentId: 246eafc77f3a0d33\tSampled: true\t\n`,
  ];
}
function mockLogLevels(reqId: string) {
  return [
    `START RequestId: 11ee14c4-1069-4850-8988-${reqId} Version: $LATEST\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\tabc12\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\tthis is a console.log\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tWARN\tthis is a console.warn\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tERROR\tthis is a console.error\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\tthis is a two\nline log\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\ttest\\period\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\ttest/period\n`,
    `2022-02-01T20:38:46.642Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\ttest { method: 'test', path: 'abc' } period\n`,
    `2022-02-01T20:38:46.644Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\t{ a: '1', b: '2' }\n`,
    `2022-02-01T20:38:46.644Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\t{"a":"1","b":"2"}\n`,
    `2022-02-01T20:38:46.682Z\t11ee14c4-1069-4850-8988-${reqId}\tINFO\tError\n    at Runtime.module.exports.main [as handler] (/var/task/handler.js:23:17)\n    at Runtime.handleOnce (/var/runtime/Runtime.js:66:25)\n`,
    `END RequestId: 11ee14c4-1069-4850-8988-${reqId}\n`,
    `REPORT RequestId: 11ee14c4-1069-4850-8988-${reqId}\tDuration: 58.96 ms\tBilled Duration: 59 ms\tMemory Size: 128 MB\tMax Memory Used: 56 MB\tInit Duration: 229.40 ms\t\nXRAY TraceId: 1-61f99a56-47e3ca9116ae85832325d1e5\tSegmentId: 11e737e3026f8575\tSampled: true\t\n`,
  ];
}
function mockLongJSONSummary(reqId: string) {
  return [
    `START RequestId: 18269d91-6b89-4021-8b58-${reqId} Version: $LATEST\n`,
    `2022-02-01T16:44:32.994Z\t46d02f3a-f831-45ff-bd2f-441552944af8\tINFO\tws.onmessage {"action":"client.lambdaResponse","debugRequestId":"46d02f3a-f831-45ff-bd2f-441552944af8-1643733872505","stubConnectionId":"M3uYidvroAMCLMA=","payload":"H4sIAAAAAAAAE6tWKkotLsjPK051SSxJVLKqViouSSwpLXbOT0lVsjIyMNBRSspPqVSyUsrIVKqtBQB6xuCnLwAAAA=="}\n`,
    `END RequestId: 18269d91-6b89-4021-8b58-${reqId}\n`,
    `REPORT RequestId: 18269d91-6b89-4021-8b58-${reqId}\tDuration: 509.89 ms\tBilled Duration: 510 ms\tMemory Size: 1024 MB\tMax Memory Used: 80 MB\t\nXRAY TraceId: 1-61f96332-54eba86c47245db57214005f\tSegmentId: 246eafc77f3a0d33\tSampled: true\t\n`,
  ];
}
function mockNoStart(reqId: string) {
  return [
    `REPORT RequestId: 18269d91-6b89-4021-8b58-${reqId}\tDuration: 509.89 ms\tBilled Duration: 510 ms\tMemory Size: 1024 MB\tMax Memory Used: 80 MB\t\nXRAY TraceId: 1-61f96332-54eba86c47245db57214005f\tSegmentId: 246eafc77f3a0d33\tSampled: true\t\n`,
  ];
}
function mockNoEnd(reqId: string) {
  return [
    `START RequestId: 18269d91-6b89-4021-8b58-${reqId} Version: $LATEST\n`,
  ];
}
function mockErrorThrown(reqId: string) {
  return [
    `START RequestId: 073b4d85-2679-48fc-bfca-${reqId} Version: $LATEST\n`,
    `2022-02-01T20:43:20.723Z\t073b4d85-2679-48fc-bfca-${reqId}\tINFO\tabc12\n`,
    `2022-02-01T20:43:20.743Z\t073b4d85-2679-48fc-bfca-${reqId}\tERROR\tInvoke Error \t{\"errorType\":\"Error\",\"errorMessage\":\"this is an exception\",\"stack\":[\"Error: this is an exception\",\"    at _homogeneousError (/var/runtime/CallbackContext.js:12:12)\",\"    at postError (/var/runtime/CallbackContext.js:29:54)\",\"    at callback (/var/runtime/CallbackContext.js:41:7)\",\"    at /var/runtime/CallbackContext.js:106:16\",\"    at Runtime.handleOnce (/var/runtime/Runtime.js:78:7)\"]}\n`,
    `END RequestId: 073b4d85-2679-48fc-bfca-${reqId}\n`,
    `REPORT RequestId: 073b4d85-2679-48fc-bfca-${reqId}\tDuration: 76.32 ms\tBilled Duration: 77 ms\tMemory Size: 128 MB\tMax Memory Used: 57 MB\t\nXRAY TraceId: 1-61f99b68-4e36730716e1db5a6f5bdb3a\tSegmentId: 19d2419e35cd5c06\tSampled: true\t\n`,
  ];
}
function mockErrorTimeout(reqId: string) {
  return [
    `START RequestId: c35741d3-8fdf-4ce7-b6cb-${reqId} Version: $LATEST\n`,
    `2022-02-01T20:45:18.184Z\tc35741d3-8fdf-4ce7-b6cb-${reqId}\tINFO\tabc12\n`,
    `END RequestId: c35741d3-8fdf-4ce7-b6cb-${reqId}\n`,
    `REPORT RequestId: c35741d3-8fdf-4ce7-b6cb-${reqId}\tDuration: 10010.65 ms\tBilled Duration: 10000 ms\tMemory Size: 128 MB\tMax Memory Used: 62 MB\t\nXRAY TraceId: 1-61f99bde-5271d4b83fbc2b6d2ac0eb60\tSegmentId: 1757f8951ad79687\tSampled: true\t\n`,
    `2022-02-01T20:45:28.182Z c35741d3-8fdf-4ce7-b6cb-${reqId} Task timed out after 10.01 seconds\n\n`,
  ];
}
function mockErrorOOM(reqId: string) {
  return [
    `START RequestId: bafb0f6a-b194-4fdd-9601-${reqId} Version: $LATEST\n`,
    `2022-02-01T20:48:01.367Z\tbafb0f6a-b194-4fdd-9601-${reqId}\tINFO\tabc12\n`,
    `2022-02-01T20:48:01.367Z\tbafb0f6a-b194-4fdd-9601-${reqId}\tINFO\tcase: oom\n`,
    `END RequestId: bafb0f6a-b194-4fdd-9601-${reqId}\n`,
    `REPORT RequestId: bafb0f6a-b194-4fdd-9601-${reqId}\tDuration: 4237.92 ms\tBilled Duration: 4238 ms\tMemory Size: 128 MB\tMax Memory Used: 128 MB\t\nXRAY TraceId: 1-61f99c81-51bfb2f96a01b1b01f09cd4a\tSegmentId: 6bd816e6200583ae\tSampled: true\t\n`,
    `RequestId: bafb0f6a-b194-4fdd-9601-${reqId} Error: Runtime exited with error: signal: killed\nRuntime.ExitError\n`,
  ];
}
function mockErrorInit(reqId: string) {
  return [
    '2022-02-01T20:08:56.333Z\tundefined\tERROR\tUncaught Exception \t"this is an exception outside of handler"\n',
    "EXTENSION\tName: my-extension\tState: Ready\tEvents: [INVOKE,SHUTDOWN]\n",
    `START RequestId: 18269d91-6b89-4021-8b58-${reqId} Version: $LATEST\n`,
    '2022-02-01T20:08:56.333Z\tundefined\tERROR\tUncaught Exception \t"this is an exception outside of handler"\n',
    "EXTENSION\tName: my-extension\tState: Ready\tEvents: [INVOKE,SHUTDOWN]\n",
    `END RequestId: 18269d91-6b89-4021-8b58-${reqId}\n`,
    `REPORT RequestId: 18269d91-6b89-4021-8b58-${reqId}\tDuration: 509.89 ms\tBilled Duration: 510 ms\tMemory Size: 1024 MB\tMax Memory Used: 80 MB\t\nXRAY TraceId: 1-61f96332-54eba86c47245db57214005f\tSegmentId: 246eafc77f3a0d33\tSampled: true\t\n`,
  ];
}
