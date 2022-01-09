/* eslint-disable @typescript-eslint/ban-ts-comment*/

import { Construct, IConstruct } from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
import { getChildLogger } from "@serverless-stack/core";
import {
  Api,
  Table,
  Topic,
  Queue,
  Bucket,
  EventBus,
  Function,
  AppSyncApi,
  WebSocketApi,
  KinesisStream,
  ApiGatewayV1Api,
  Stack,
} from "../index";
import { isCDKConstruct, isCDKConstructOf } from "../Construct";

const logger = getChildLogger("resources");

export type Permissions = PermissionType | Permission[];
type Permission =
  | string
  | IConstruct
  | [IConstruct, string]
  | iam.PolicyStatement;

export enum PermissionType {
  ALL = "*",
}

export function attachPermissionsToRole(
  role: iam.Role,
  permissions: Permissions
): void {
  // Four patterns
  //
  // attachPermissions(PermissionType.ALL);
  // attachPermissions([ 'sns', 'sqs' ]);
  // attachPermissions([ event, queue ]);
  // attachPermissions([
  //   [ event.snsTopic, 'grantPublish' ],
  //   [ queue.sqsQueue, 'grantSendMessages' ],
  // ]);
  // attachPermissions([
  //   new iam.PolicyStatement({
  //     actions: ["s3:*"],
  //     effect: iam.Effect.ALLOW,
  //     resources: [
  //       bucket.bucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
  //     ],
  //   })
  // ]);

  ////////////////////////////////////
  // Case: 'admin' permissions => '*'
  ////////////////////////////////////
  if (typeof permissions === "string") {
    if (permissions === PermissionType.ALL) {
      role.addToPolicy(buildPolicy(permissions, ["*"]));
    } else {
      throw new Error(`The specified permissions are not supported.`);
    }
    return;
  }

  if (!Array.isArray(permissions)) {
    throw new Error(
      `The specified permissions are not supported. They are expected to be PermissionType.ALL or an array.`
    );
  }

  // Handle array of permissions
  permissions.forEach((permission: Permission) => {
    ////////////////////////////////////
    // Case: string ie. 's3' or 's3:*'
    ////////////////////////////////////
    if (typeof permission === "string") {
      const perm =
        permission.indexOf(":") === -1 ? `${permission}:*` : permission;
      role.addToPolicy(buildPolicy(perm, ["*"]));
    }
    ////////////////////////////////////
    // Case: iam.PolicyStatement
    ////////////////////////////////////
    else if (
      isCDKConstructOf(permission as Construct, "aws-cdk-lib.aws_iam.PolicyStatement")
    ) {
      role.addToPolicy(permission as iam.PolicyStatement);
    }
    ////////////////////////////////////
    // Case: CDK constructs
    ////////////////////////////////////
    else if ((permission as any).tableArn && (permission as any).tableName) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      const tableArn = permission.tableArn;
      role.addToPolicy(buildPolicy("dynamodb:*", [tableArn, `${tableArn}/*`]));
    } else if ((permission as any).topicArn && (permission as any).topicName) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      role.addToPolicy(buildPolicy("sns:*", [permission.topicArn]));
    } else if ((permission as any).queueArn && (permission as any).queueName) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      role.addToPolicy(buildPolicy("sqs:*", [permission.queueArn]));
    } else if (
      (permission as any).eventBusArn &&
      (permission as any).eventBusName
    ) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      role.addToPolicy(buildPolicy("events:*", [permission.eventBusArn]));
    } else if (
      (permission as any).streamArn &&
      (permission as any).streamName
    ) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      role.addToPolicy(buildPolicy("kinesis:*", [permission.streamArn]));
    } else if (
      (permission as any).bucketArn &&
      (permission as any).bucketName
    ) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      const bucketArn = permission.bucketArn;
      role.addToPolicy(buildPolicy("s3:*", [bucketArn, `${bucketArn}/*`]));
    } else if ((permission as any).clusterArn) {
      // For ServerlessCluster, we need to grant:
      // - permisssions to access the Data API;
      // - permisssions to access the Secret Manager (required by Data API).
      // No need to grant the permissions for IAM database authentication
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      role.addToPolicy(buildPolicy("rds-data:*", [permission.clusterArn]));
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      const secret = permission.secret;
      if (secret) {
        role.addToPolicy(
          buildPolicy("secretsmanager:GetSecretValue", [secret.secretArn])
        );
      }
    }
    ////////////////////////////////////
    // Case: SST construct
    ////////////////////////////////////
    else if (permission instanceof Api) {
      const httpApi = permission.httpApi;
      const { account, region } = Stack.of(httpApi);
      role.addToPolicy(
        buildPolicy("execute-api:Invoke", [
          `arn:aws:execute-api:${region}:${account}:${httpApi.httpApiId}/*`,
        ])
      );
    } else if (permission instanceof ApiGatewayV1Api) {
      const restApi = permission.restApi;
      const { account, region } = Stack.of(restApi);
      role.addToPolicy(
        buildPolicy("execute-api:Invoke", [
          `arn:aws:execute-api:${region}:${account}:${restApi.restApiId}/*`,
        ])
      );
    } else if (permission instanceof WebSocketApi) {
      const webSocketApi = permission.webSocketApi;
      const { account, region } = Stack.of(webSocketApi);
      role.addToPolicy(
        buildPolicy("execute-api:Invoke", [
          `arn:aws:execute-api:${region}:${account}:${webSocketApi.apiId}/*`,
        ])
      );
      role.addToPolicy(
        buildPolicy("execute-api:ManageConnections", [
          permission._connectionsArn,
        ])
      );
    } else if (permission instanceof AppSyncApi) {
      const graphqlApi = permission.graphqlApi;
      const { account, region } = Stack.of(graphqlApi);
      role.addToPolicy(
        buildPolicy("appsync:GraphQL", [
          `arn:aws:appsync:${region}:${account}:apis/${graphqlApi.apiId}/*`,
        ])
      );
    } else if (permission instanceof Table) {
      const tableArn = permission.dynamodbTable.tableArn;
      role.addToPolicy(buildPolicy("dynamodb:*", [tableArn, `${tableArn}/*`]));
    } else if (permission instanceof Topic) {
      role.addToPolicy(buildPolicy("sns:*", [permission.snsTopic.topicArn]));
    } else if (permission instanceof Queue) {
      role.addToPolicy(buildPolicy("sqs:*", [permission.sqsQueue.queueArn]));
    } else if (permission instanceof EventBus) {
      role.addToPolicy(
        buildPolicy("events:*", [permission.eventBridgeEventBus.eventBusArn])
      );
    } else if (permission instanceof KinesisStream) {
      role.addToPolicy(
        buildPolicy("kinesis:*", [permission.kinesisStream.streamArn])
      );
    } else if (permission instanceof Bucket) {
      const bucketArn = permission.s3Bucket.bucketArn;
      role.addToPolicy(buildPolicy("s3:*", [bucketArn, `${bucketArn}/*`]));
    } else if (permission instanceof Function) {
      role.addToPolicy(buildPolicy("lambda:*", [permission.functionArn]));
    }
    ////////////////////////////////////
    // Case: grant method
    ////////////////////////////////////
    else if (
      Array.isArray(permission) &&
      permission.length === 2 &&
      isCDKConstruct(permission[0]) &&
      typeof permission[1] === "string"
    ) {
      const construct = permission[0] as Construct;
      const methodName = permission[1] as keyof Construct;
      if (typeof construct[methodName] !== "function")
        throw new Error(
          `The specified grant method is incorrect.
          Check the available methods that prefixed with grants on the Construct`
        );
      (construct[methodName] as { (construct: Construct): void })(role);
    } else {
      logger.debug("permission object", permission);
      throw new Error(`The specified permissions are not supported.`);
    }
  });
}

function buildPolicy(action: string, resources: string[]): iam.PolicyStatement {
  return new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [action],
    resources,
  });
}
