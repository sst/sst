/* eslint-disable @typescript-eslint/ban-ts-comment*/

import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import { getChildLogger } from "@serverless-stack/core";
import { Api } from "../Api";
import { Table } from "../Table";
import { Topic } from "../Topic";
import { Queue } from "../Queue";
import { Stack } from "../Stack";

const logger = getChildLogger("resources");

export type Permissions = PermissionType | Permission[];
type Permission =
  | string
  | cdk.Construct
  | [cdk.Construct, string]
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

  // Handle array of permissions
  permissions.forEach((permission: Permission) => {
    // Case: 's3' permissions => 's3:*'
    if (typeof permission === "string") {
      role.addToPolicy(buildPolicy(`${permission}:*`, ["*"]));
      return;
    }

    // We need to check if permission is an CDK construct. To do that:
    // - we cannot use the `permission instanceof` check because ie. the PolicyStatement
    //   instance in the user's app might come from a different npm package version
    // - we cannot use the `permission.constructor.name` check because the constructor
    //   name can be prefixed with a number ie. PolicyStatement2
    //
    // Therefore we are going to get the constructor's fqn. The constructor for a CDK
    // construct looks like:
    //    [class Bucket2 extends BucketBase] {
    //      [Symbol(jsii.rtti)]: { fqn: '@aws-cdk/aws-s3.Bucket', version: '1.91.0' }
    //    }
    // We will check against `fqn`.
    let cdkModule;
    const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
    // @ts-expect-error TS7053: Element implicitly has an 'any' type because expression of type 'unique symbol' can't be used to index type 'Function'.
    const fqn = permission.constructor?.[JSII_RTTI_SYMBOL_1]?.fqn;
    if (typeof fqn === "string" && fqn.startsWith("@aws-cdk/")) {
      cdkModule = fqn.substring(9);
    }

    ////////////////////////////////////
    // Case: iam.PolicyStatement
    ////////////////////////////////////
    if (cdkModule === "aws-iam.PolicyStatement") {
      role.addToPolicy(permission as iam.PolicyStatement);
    }
    ////////////////////////////////////
    // Case: CDK constructs
    ////////////////////////////////////
    else if (cdkModule === "aws-dynamodb.Table") {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      const tableArn = permission.tableArn;
      role.addToPolicy(buildPolicy("dynamodb:*", [tableArn, `${tableArn}/*`]));
    } else if (cdkModule === "aws-sns.Topic") {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      role.addToPolicy(buildPolicy("sns:*", [permission.topicArn]));
    } else if (cdkModule === "aws-sqs.Queue") {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      role.addToPolicy(buildPolicy("sqs:*", [permission.queueArn]));
    } else if (cdkModule === "aws-s3.Bucket") {
      // @ts-expect-error We do not want to import the cdk modules, just cast to any
      const bucketArn = permission.bucketArn;
      role.addToPolicy(buildPolicy("s3:*", [bucketArn, `${bucketArn}/*`]));
    }
    ////////////////////////////////////
    // Case: SST construct => 's3:*'
    ////////////////////////////////////
    else if (permission instanceof Api) {
      const httpApi = permission.httpApi;
      const { account, region } = Stack.of(httpApi);
      role.addToPolicy(
        buildPolicy("execute-api:Invoke", [
          `arn:aws:execute-api:${region}:${account}:${httpApi.httpApiId}/*`,
        ])
      );
    } else if (permission instanceof Table) {
      const tableArn = permission.dynamodbTable.tableArn;
      role.addToPolicy(buildPolicy("dynamodb:*", [tableArn, `${tableArn}/*`]));
    } else if (permission instanceof Topic) {
      role.addToPolicy(buildPolicy("sns:*", [permission.snsTopic.topicArn]));
    } else if (permission instanceof Queue) {
      role.addToPolicy(buildPolicy("sqs:*", [permission.sqsQueue.queueArn]));
    }
    ////////////////////////////////////
    // Case: grant method
    ////////////////////////////////////
    else if (
      Array.isArray(permission) &&
      permission.length === 2 &&
      cdk.Construct.isConstruct(permission[0]) &&
      typeof permission[1] === "string"
    ) {
      const construct = permission[0] as cdk.Construct;
      const methodName = permission[1] as keyof cdk.Construct;
      (construct[methodName] as { (construct: cdk.Construct): void })(role);
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
