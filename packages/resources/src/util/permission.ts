/* eslint-disable @typescript-eslint/ban-ts-comment*/

import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import { Table } from "../Table";
import { Queue } from "../Queue";
import { Topic } from "../Topic";

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
  // attachPermissions('*');
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

  // Case: 'admin' permissions => '*'
  if (typeof permissions === "string") {
    if (permissions === PermissionType.ALL) {
      role.addToPolicy(buildPolicy(permissions, ["*"]));
    } else {
      throw new Error(`The specified permissions are not supported.`);
    }
  } else {
    permissions.forEach((permission: Permission) => {
      // Case: 's3' permissions => 's3:*'
      if (typeof permission === "string") {
        role.addToPolicy(buildPolicy(`${permission}:*`, ["*"]));
      }

      // Case: iam.PolicyStatement
      else if (permission instanceof iam.PolicyStatement) {
        role.addToPolicy(permission);
      }
      // Case: construct => 's3:*'
      else if (permission instanceof Table) {
        const tableArn = permission.dynamodbTable.tableArn;
        role.addToPolicy(
          buildPolicy("dynamodb:*", [tableArn, `${tableArn}/*`])
        );
      } else if (permission instanceof Topic) {
        role.addToPolicy(buildPolicy("sns:*", [permission.snsTopic.topicArn]));
      } else if (permission instanceof Queue) {
        role.addToPolicy(buildPolicy("sqs:*", [permission.sqsQueue.queueArn]));
      } else if (permission instanceof cdk.Construct) {
        switch (permission.node?.defaultChild?.constructor.name) {
          case "CfnTable": {
            // @ts-expect-error We do not want to import the cdk modules, just cast to any
            const tableArn = permission.tableArn;
            role.addToPolicy(
              buildPolicy("dynamodb:*", [tableArn, `${tableArn}/*`])
            );
            break;
          }
          case "CfnTopic": {
            // @ts-expect-error We do not want to import the cdk modules, just cast to any
            role.addToPolicy(buildPolicy("sns:*", [permission.topicArn]));
            break;
          }
          case "CfnQueue": {
            // @ts-expect-error We do not want to import the cdk modules, just cast to any
            role.addToPolicy(buildPolicy("sqs:*", [permission.queueArn]));
            break;
          }
          case "CfnBucket": {
            // @ts-expect-error We do not want to import the cdk modules, just cast to any
            const bucketArn = permission.bucketArn;
            role.addToPolicy(
              buildPolicy("s3:*", [bucketArn, `${bucketArn}/*`])
            );
            break;
          }
          default:
            throw new Error(
              `The specified permissions is not a supported construct type.`
            );
        }
      }
      // Case: grant method
      else if (
        permission.length === 2 &&
        permission[0] instanceof cdk.Construct &&
        typeof permission[1] === "string"
      ) {
        const construct = permission[0] as cdk.Construct;
        const methodName = permission[1] as keyof cdk.Construct;
        (construct[methodName] as { (construct: cdk.Construct): void })(role);
      } else {
        throw new Error(`The specified permissions are not supported.`);
      }
    });
  }
}

function buildPolicy(action: string, resources: string[]): iam.PolicyStatement {
  return new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [action],
    resources,
  });
}
