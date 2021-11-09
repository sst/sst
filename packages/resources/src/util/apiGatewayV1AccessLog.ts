import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as apig from "@aws-cdk/aws-apigateway";
import { App } from "../App";

export interface AccessLogProps extends apig.CfnStage.AccessLogSettingProperty {
  retention?: logs.RetentionDays; 
}

export type AccessLogData = {
  logGroup: logs.LogGroup | undefined,
  format: apig.AccessLogFormat,
  destination: apig.LogGroupLogDestination,
}

type AccessLogDestinationConfig = {
  destinationArn: string | undefined;
}

export function buildAccessLogData(
  scope: cdk.Construct,
  accessLog:
    | boolean
    | string
    | apig.CfnStage.AccessLogSettingProperty
    | AccessLogProps
    | undefined,
    stageName: string,
  isDefaultStage: boolean
): AccessLogData | undefined {
  if (accessLog === false) {
    return;
  }

  // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
  //       need to define it at L1 construct level.

  // create log group
  let logGroup;
  let destinationArn;
  if (
    accessLog &&
    (accessLog as apig.CfnStage.AccessLogSettingProperty).destinationArn
  ) {
    destinationArn = (accessLog as apig.CfnStage.AccessLogSettingProperty)
      .destinationArn;
  } else {
    let retention = logs.RetentionDays.INFINITE;
    if (
      accessLog &&
      (accessLog as AccessLogProps).retention
    ) {
      retention = (accessLog as AccessLogProps).retention ||
        logs.RetentionDays.INFINITE;
    }
    logGroup = new logs.LogGroup(scope, "LogGroup", {
      retention
    });
    destinationArn = logGroup.logGroupArn;
  }

  // get log format
  let format: string;
  if (
    accessLog &&
    (accessLog as apig.CfnStage.AccessLogSettingProperty).format
  ) {
    format = (accessLog as apig.CfnStage.AccessLogSettingProperty).format as string;
  } else if (
    accessLog &&
    (accessLog as AccessLogProps).format
  ) {
    format = (accessLog as AccessLogProps).format as string;
  } else if (typeof accessLog === "string") {
    format = accessLog;
  } else {
    format = "{" +
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
    destination: (new LogGroupDestination(destinationArn) as unknown) as apig.LogGroupLogDestination,
  };

  return accessLogData;
}

export function cleanupLogGroupName(str: string): string {
  return str.replace(/[^.\-_/#A-Za-z0-9]/g, "");
}

export class LogGroupDestination {
  constructor(private readonly destinationArn: string | undefined) {
  }

  public bind(): AccessLogDestinationConfig {
    return {
      destinationArn: this.destinationArn,
    };
  }
}
