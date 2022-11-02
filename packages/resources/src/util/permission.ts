/* eslint-disable @typescript-eslint/ban-ts-comment*/

import { Construct, IConstruct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { getChildLogger } from "@serverless-stack/core";
import {
  Api,
  Job,
  RDS,
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
} from "../index.js";
import { isCDKConstruct, isCDKConstructOf } from "../Construct.js";

const logger = getChildLogger("resources");

export type Permissions = "*" | Permission[];
type SupportedPermissions =
  | "execute-api"
  | "appsync"
  | "dynamodb"
  | "sns"
  | "sqs"
  | "events"
  | "kinesis"
  | "s3"
  | "rds-data"
  | "secretsmanager"
  | "lambda"
  | "ssm";
type Permission =
  | SupportedPermissions
  | Omit<string, SupportedPermissions>
  | IConstruct
  | [IConstruct, string]
  | iam.PolicyStatement;
type StatementsAndGrants = {
  statements: iam.PolicyStatement[];
  grants: [IConstruct, string][];
}

export function attachPermissionsToRole(
  role: iam.Role,
  permissions: Permissions
): void {
  const { statements, grants } = permissionsToStatementsAndGrants(permissions);
  statements.forEach((statement) => role.addToPolicy(statement));
  grants.forEach(grant => {
    const construct = grant[0] as Construct;
    const methodName = grant[1] as keyof Construct;
    (construct[methodName] as { (construct: Construct): void })(role);
  });
}

export function attachPermissionsToPolicy(
  policy: iam.Policy,
  permissions: Permissions
): void {
  const { statements, grants } = permissionsToStatementsAndGrants(permissions);
  statements.forEach((statement) => policy.addStatements(statement));
  grants.forEach(grant => {
    throw new Error(`Cannot attach the "${grant[1]}" permission to an IAM policy.`);
  });
}

function permissionsToStatementsAndGrants(permissions: Permissions): StatementsAndGrants {
  // Four patterns
  //
  // attachPermissions("*");
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
  if (permissions === "*") {
    return {
      statements: [buildPolicyStatement(permissions, ["*"])],
      grants: [],
    };
  }

  if (!Array.isArray(permissions)) {
    throw new Error(
      `The specified permissions are not supported. They are expected to be "*" or an array.`
    );
  }

  // Handle array of permissions
  const statements: iam.PolicyStatement[] = [];
  const grants: [IConstruct, string][] = [];
  permissions.forEach((permission: Permission) => {
    ////////////////////////////////////
    // Case: string ie. 's3' or 's3:*'
    ////////////////////////////////////
    if (typeof permission === "string") {
      const perm =
        permission.indexOf(":") === -1 ? `${permission}:*` : permission;
      statements.push(buildPolicyStatement(perm, ["*"]));
    }
    ////////////////////////////////////
    // Case: iam.PolicyStatement
    ////////////////////////////////////
    else if (
      isCDKConstructOf(
        permission as Construct,
        "aws-cdk-lib.aws_iam.PolicyStatement"
      )
    ) {
      statements.push(permission as iam.PolicyStatement);
    }
    ////////////////////////////////////
    // Case: SST construct
    ////////////////////////////////////
    else if (permission instanceof Api) {
      const httpApi = permission.cdk.httpApi;
      const { account, region } = Stack.of(httpApi);
      statements.push(
        buildPolicyStatement("execute-api:Invoke", [
          `arn:aws:execute-api:${region}:${account}:${httpApi.httpApiId}/*`,
        ])
      );
    } else if (permission instanceof ApiGatewayV1Api) {
      const restApi = permission.cdk.restApi;
      const { account, region } = Stack.of(restApi);
      statements.push(
        buildPolicyStatement("execute-api:Invoke", [
          `arn:aws:execute-api:${region}:${account}:${restApi.restApiId}/*`,
        ])
      );
    } else if (permission instanceof WebSocketApi) {
      const webSocketApi = permission.cdk.webSocketApi;
      const { account, region } = Stack.of(webSocketApi);
      statements.push(
        buildPolicyStatement("execute-api:Invoke", [
          `arn:aws:execute-api:${region}:${account}:${webSocketApi.apiId}/*`,
        ])
      );
      statements.push(
        buildPolicyStatement("execute-api:ManageConnections", [
          permission._connectionsArn,
        ])
      );
    } else if (permission instanceof AppSyncApi) {
      const graphqlApi = permission.cdk.graphqlApi;
      const { account, region } = Stack.of(graphqlApi);
      statements.push(
        buildPolicyStatement("appsync:GraphQL", [
          `arn:aws:appsync:${region}:${account}:apis/${graphqlApi.apiId}/*`,
        ])
      );
    } else if (permission instanceof Table) {
      const tableArn = permission.cdk.table.tableArn;
      statements.push(buildPolicyStatement("dynamodb:*", [tableArn, `${tableArn}/*`]));
    } else if (permission instanceof Topic) {
      statements.push(buildPolicyStatement("sns:*", [permission.cdk.topic.topicArn]));
    } else if (permission instanceof Queue) {
      statements.push(buildPolicyStatement("sqs:*", [permission.cdk.queue.queueArn]));
    } else if (permission instanceof EventBus) {
      statements.push(
        buildPolicyStatement("events:*", [permission.cdk.eventBus.eventBusArn])
      );
    } else if (permission instanceof KinesisStream) {
      statements.push(
        buildPolicyStatement("kinesis:*", [permission.cdk.stream.streamArn])
      );
    } else if (permission instanceof Bucket) {
      const bucketArn = permission.cdk.bucket.bucketArn;
      statements.push(buildPolicyStatement("s3:*", [bucketArn, `${bucketArn}/*`]));
    } else if (permission instanceof RDS) {
      statements.push(buildPolicyStatement("rds-data:*", [permission.clusterArn]));
      if (permission.cdk.cluster.secret) {
        statements.push(
          buildPolicyStatement(
            ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
            [permission.cdk.cluster.secret.secretArn]
          )
        );
      }
    } else if (permission instanceof Function) {
      statements.push(buildPolicyStatement("lambda:*", [permission.functionArn]));
    } else if (permission instanceof Job) {
      statements.push(buildPolicyStatement("lambda:*", [permission._jobInvoker.functionArn]));
    }
    ////////////////////////////////////
    // Case: CDK constructs
    ////////////////////////////////////
    else if ((permission as any).tableArn && (permission as any).tableName) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      const tableArn = permission.tableArn;
      statements.push(buildPolicyStatement("dynamodb:*", [tableArn, `${tableArn}/*`]));
    } else if ((permission as any).topicArn && (permission as any).topicName) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      statements.push(buildPolicyStatement("sns:*", [permission.topicArn]));
    } else if ((permission as any).queueArn && (permission as any).queueName) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      statements.push(buildPolicyStatement("sqs:*", [permission.queueArn]));
    } else if (
      (permission as any).eventBusArn &&
      (permission as any).eventBusName
    ) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      statements.push(buildPolicyStatement("events:*", [permission.eventBusArn]));
    } else if (
      (permission as any).streamArn &&
      (permission as any).streamName
    ) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      statements.push(buildPolicyStatement("kinesis:*", [permission.streamArn]));
    } else if (
      (permission as any).deliveryStreamArn &&
      (permission as any).deliveryStreamName
    ) {
      statements.push(
        buildPolicyStatement("firehose:*", [(permission as any).deliveryStreamArn])
      );
    } else if (
      (permission as any).bucketArn &&
      (permission as any).bucketName
    ) {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      const bucketArn = permission.bucketArn;
      statements.push(buildPolicyStatement("s3:*", [bucketArn, `${bucketArn}/*`]));
    } else if ((permission as any).clusterArn) {
      // For ServerlessCluster, we need to grant:
      // - permisssions to access the Data API;
      // - permisssions to access the Secret Manager (required by Data API).
      // No need to grant the permissions for IAM database authentication
      statements.push(
        buildPolicyStatement("rds-data:*", [(permission as any).clusterArn])
      );
      const secret = (permission as any).secret;
      if (secret) {
        statements.push(
          buildPolicyStatement(
            ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
            [secret.secretArn]
          )
        );
      }
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
      grants.push(permission);
    } else {
      logger.debug("permission object", permission);
      throw new Error(`The specified permissions are not supported.`);
    }
  });

  return { statements, grants }
}

function buildPolicyStatement(
  actions: string | string[],
  resources: string[]
): iam.PolicyStatement {
  return new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: typeof actions === "string" ? [actions] : actions,
    resources,
  });
}