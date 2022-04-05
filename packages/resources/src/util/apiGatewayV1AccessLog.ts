import { Construct } from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as apig from "aws-cdk-lib/aws-apigateway";

export interface AccessLogProps {
  format?: string;
  destinationArn?: string;
  retention?: Lowercase<keyof typeof logs.RetentionDays>;
}

export type AccessLogData = {
  logGroup: logs.LogGroup | undefined;
  format: apig.AccessLogFormat;
  destination: apig.LogGroupLogDestination;
};

export function buildAccessLogData(
  scope: Construct,
  accessLog: boolean | string | AccessLogProps | undefined
): AccessLogData | undefined {
  if (accessLog === false) {
    return;
  }

  // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
  //       need to define it at L1 construct level.

  // create log group
  let logGroup;
  let destination;
  if (accessLog && (accessLog as AccessLogProps).destinationArn) {
    // note: do not set "LogGroupLogDestination" as "logGroup" because we only
    //       want to set "logGroup" if it is newly created. If we decide to
    //       change this behavior at a later date, make sure we change it for
    //       both v1 and v2 API constructs.
    const destinationArn = (accessLog as AccessLogProps)
      .destinationArn as string;
    const destinationLogGroup = logs.LogGroup.fromLogGroupArn(
      scope,
      "LogGroup",
      destinationArn
    );
    destination = new apig.LogGroupLogDestination(destinationLogGroup);
  } else {
    const retention =
      (accessLog && (accessLog as AccessLogProps).retention) || "INFINITE";
    const retentionValue =
      logs.RetentionDays[
        retention.toUpperCase() as keyof typeof logs.RetentionDays
      ];

    // validate retention
    if (!retentionValue) {
      throw new Error(`Invalid access log retention value "${retention}".`);
    }

    logGroup = new logs.LogGroup(scope, "LogGroup", {
      retention: retentionValue,
    });
    destination = new apig.LogGroupLogDestination(logGroup);
  }

  // get log format
  let format: string;
  if (accessLog && (accessLog as AccessLogProps).format) {
    format = (accessLog as AccessLogProps).format as string;
  } else if (typeof accessLog === "string") {
    format = accessLog;
  } else {
    format =
      "{" +
      [
        // request info
        `"requestTime":"$context.requestTime"`,
        `"requestId":"$context.requestId"`,
        `"httpMethod":"$context.httpMethod"`,
        `"path":"$context.path"`,
        `"resourcePath":"$context.resourcePath"`,
        `"status":$context.status`, // integer value, do not wrap in quotes
        `"responseLatency":$context.responseLatency`, // integer value, do not wrap in quotes
        `"xrayTraceId":"$context.xrayTraceId"`,
        // integration info
        `"integrationRequestId":"$context.integration.requestId"`,
        `"functionResponseStatus":"$context.integration.status"`,
        `"integrationLatency":"$context.integration.latency"`,
        `"integrationServiceStatus":"$context.integration.integrationStatus"`,
        // caller info
        `"ip":"$context.identity.sourceIp"`,
        `"userAgent":"$context.identity.userAgent"`,
        `"principalId":"$context.authorizer.principalId"`,
      ].join(",") +
      "}";
  }

  const accessLogData = {
    logGroup,
    format: apig.AccessLogFormat.custom(format),
    destination,
  };

  return accessLogData;
}

export function cleanupLogGroupName(str: string): string {
  return str.replace(/[^.\-_/#A-Za-z0-9]/g, "");
}
