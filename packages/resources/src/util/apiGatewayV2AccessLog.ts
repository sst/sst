import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import { App } from "../App";

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
  scope: cdk.Construct,
  accessLog:
    | boolean
    | string
    | apig.CfnStage.AccessLogSettingsProperty
    | undefined,
  apiStage: apig.WebSocketStage | apig.HttpStage
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
  if (
    accessLog &&
    (accessLog as apig.CfnStage.AccessLogSettingsProperty).destinationArn
  ) {
    destinationArn = (accessLog as apig.CfnStage.AccessLogSettingsProperty)
      .destinationArn;
  } else {
    const root = scope.node.root as App;
    const apiName = root.logicalPrefixedName(scope.node.id);
    logGroup = new logs.LogGroup(scope, "LogGroup" + apiStage.stageName, {
      logGroupName: [
        `/aws/vendedlogs/apis`,
        `/${cleanupLogGroupName(apiName)}-${apiStage.api.apiId}`,
        `/${cleanupLogGroupName(apiStage.stageName)}`,
      ].join(""),
    });
    destinationArn = logGroup.logGroupArn;
  }

  // get log format
  let format;
  if (
    accessLog &&
    (accessLog as apig.CfnStage.AccessLogSettingsProperty).format
  ) {
    format = (accessLog as apig.CfnStage.AccessLogSettingsProperty).format;
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
  const cfnStage = apiStage.node.defaultChild as apig.CfnStage;
  cfnStage.accessLogSettings = { format, destinationArn };

  return logGroup;
}

export function cleanupLogGroupName(str: string): string {
  return str.replace(/[^.\-_/#A-Za-z0-9]/g, "");
}
