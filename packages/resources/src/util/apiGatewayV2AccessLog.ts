import { Construct } from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cfnApig from "aws-cdk-lib/aws-apigatewayv2";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import { App } from "../App";

export interface AccessLogProps {
  format?: string;
  destinationArn?: string;
  retention?: Lowercase<keyof typeof logs.RetentionDays>;
}

const defaultHttpFields = [
  // request info
  `"requestTime":"$context.requestTime"`,
  `"requestId":"$context.requestId"`,
  `"httpMethod":"$context.httpMethod"`,
  `"path":"$context.path"`,
  `"routeKey":"$context.routeKey"`,
  `"status":$context.status`, // integer value, do not wrap in quotes
  `"responseLatency":$context.responseLatency`, // integer value, do not wrap in quotes
  // integration info
  `"integrationRequestId":"$context.integration.requestId"`,
  `"integrationStatus":"$context.integration.status"`,
  `"integrationLatency":"$context.integration.latency"`,
  `"integrationServiceStatus":"$context.integration.integrationStatus"`,
  // caller info
  `"ip":"$context.identity.sourceIp"`,
  `"userAgent":"$context.identity.userAgent"`,
  `"cognitoIdentityId":"$context.identity.cognitoIdentityId"`,
];

const defaultWebSocketFields = [
  // request info
  `"requestTime":"$context.requestTime"`,
  `"requestId":"$context.requestId"`,
  `"eventType":"$context.eventType"`,
  `"routeKey":"$context.routeKey"`,
  `"status":$context.status`, // integer value, do not wrap in quotes
  // integration info
  `"integrationRequestId":"$context.awsEndpointRequestId"`,
  `"integrationStatus":"$context.integrationStatus"`,
  `"integrationLatency":"$context.integrationLatency"`,
  `"integrationServiceStatus":"$context.integration.integrationStatus"`,
  // caller info
  `"ip":"$context.identity.sourceIp"`,
  `"userAgent":"$context.identity.userAgent"`,
  `"cognitoIdentityId":"$context.identity.cognitoIdentityId"`,
  `"connectedAt":"$context.connectedAt"`,
  `"connectionId":"$context.connectionId"`,
];

export function buildAccessLogData(
  scope: Construct,
  accessLog: boolean | string | AccessLogProps | undefined,
  apiStage: apig.WebSocketStage | apig.HttpStage,
  isDefaultStage: boolean
): logs.LogGroup | undefined {
  if (accessLog === false) {
    return;
  }

  const isWebSocketApi = apiStage instanceof apig.WebSocketStage;

  // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
  //       need to define it at L1 construct level.

  // create log group
  let logGroup;
  let destinationArn;
  if (accessLog && (accessLog as AccessLogProps).destinationArn) {
    destinationArn = (accessLog as AccessLogProps).destinationArn;
  } else {
    const root = scope.node.root as App;
    const apiName = root.logicalPrefixedName(scope.node.id);
    // Backwards compatibility, only suffix if not default stage
    const logGroupName =
      "LogGroup" + (isDefaultStage ? "" : apiStage.stageName);

    logGroup = new logs.LogGroup(scope, logGroupName, {
      logGroupName: [
        `/aws/vendedlogs/apis`,
        `/${cleanupLogGroupName(apiName)}-${apiStage.api.apiId}`,
        `/${cleanupLogGroupName(apiStage.stageName)}`,
      ].join(""),
      retention: buildLogGroupRetention(accessLog),
    });
    destinationArn = logGroup.logGroupArn;
  }

  // get log format
  let format;
  if (accessLog && (accessLog as AccessLogProps).format) {
    format = (accessLog as AccessLogProps).format;
  } else if (typeof accessLog === "string") {
    format = accessLog;
  } else {
    format = isWebSocketApi
      ? "{" + defaultWebSocketFields.join(",") + "}"
      : "{" + defaultHttpFields.join(",") + "}";
  }

  // get L1 cfnStage construct
  if (!apiStage?.node.defaultChild) {
    throw new Error(`Failed to define the default stage for Http API`);
  }

  // set access log settings
  const cfnStage = apiStage.node.defaultChild as cfnApig.CfnStage;
  cfnStage.accessLogSettings = { format, destinationArn };

  return logGroup;
}

export function cleanupLogGroupName(str: string): string {
  return str.replace(/[^.\-_/#A-Za-z0-9]/g, "");
}

function buildLogGroupRetention(
  accessLog?: boolean | string | AccessLogProps
): logs.RetentionDays {
  const retention = accessLog && (accessLog as AccessLogProps).retention;
  if (!retention) {
    return logs.RetentionDays.INFINITE;
  }

  // Case: retention is string
  const retentionValue =
    logs.RetentionDays[
      retention.toUpperCase() as keyof typeof logs.RetentionDays
    ];

  // validate retention
  if (!retentionValue) {
    throw new Error(`Invalid access log retention value "${retention}".`);
  }

  return retentionValue;
}
