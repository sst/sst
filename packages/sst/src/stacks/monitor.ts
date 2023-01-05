import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
  DescribeStackResourcesOutput,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { SdkError } from "@aws-sdk/types";
import { useBus } from "../bus.js";
import { useAWSClient } from "../credentials.js";
import { Logger } from "../logger.js";

declare module "../bus.js" {
  export interface Events {
    "stack.updated": {
      stackID: string;
    };
    "stack.status": {
      stackID: string;
      status: typeof STATUSES[number];
    };
    "stack.resources": {
      stackID: string;
      resources: DescribeStackResourcesOutput["StackResources"];
    };
  }
}

const STATUSES_PENDING = [
  "CREATE_IN_PROGRESS",
  "DELETE_IN_PROGRESS",
  "REVIEW_IN_PROGRESS",
  "ROLLBACK_IN_PROGRESS",
  "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS",
  "UPDATE_IN_PROGRESS",
  "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS",
  "UPDATE_ROLLBACK_IN_PROGRESS",
] as const;

const STATUSES_SUCCESS = [
  "CREATE_COMPLETE",
  "UPDATE_COMPLETE",
  "DELETE_COMPLETE",
  "SKIPPED",
] as const;

const STATUSES_FAILED = [
  "CREATE_FAILED",
  "DELETE_FAILED",
  "ROLLBACK_FAILED",
  "ROLLBACK_COMPLETE",
  "UPDATE_FAILED",
  "UPDATE_ROLLBACK_COMPLETE",
  "UPDATE_ROLLBACK_FAILED",
  "DEPENDENCY_FAILED",
] as const;

export const STATUSES = [
  ...STATUSES_PENDING,
  ...STATUSES_SUCCESS,
  ...STATUSES_FAILED,
] as const;

export function isFinal(input: string) {
  return (
    STATUSES_SUCCESS.includes(input as any) ||
    STATUSES_FAILED.includes(input as any)
  );
}

export function isFailed(input: string) {
  return STATUSES_FAILED.includes(input as any);
}

export function isSuccess(input: string) {
  return STATUSES_SUCCESS.includes(input as any);
}

export function isPending(input: string) {
  return STATUSES_PENDING.includes(input as any);
}

export async function monitor(stack: string) {
  const [cfn, bus] = await Promise.all([
    useAWSClient(CloudFormationClient),
    useBus(),
  ]);

  let lastStatus: string | undefined;
  const errors: Record<string, string> = {};
  while (true) {
    try {
      const [describe, resources] = await Promise.all([
        cfn.send(
          new DescribeStacksCommand({
            StackName: stack,
          })
        ),
        cfn.send(
          new DescribeStackResourcesCommand({
            StackName: stack,
          })
        ),
      ]);

      Logger.debug("Stack description", describe);

      bus.publish("stack.resources", {
        stackID: stack,
        resources: resources.StackResources,
      });

      for (const resource of resources.StackResources || []) {
        if (
          resource.ResourceStatusReason?.includes("Resource creation cancelled")
        )
          continue;
        if (resource.ResourceStatusReason)
          errors[resource.LogicalResourceId!] = resource.ResourceStatusReason;
      }

      const [first] = describe.Stacks || [];
      if (first) {
        if (lastStatus !== first.StackStatus && first.StackStatus) {
          lastStatus = first.StackStatus;
          bus.publish("stack.status", {
            stackID: stack,
            status: first.StackStatus as any,
          });
          Logger.debug(first);
          if (isFinal(first.StackStatus)) {
            return {
              status: first.StackStatus as typeof STATUSES[number],
              outputs: Object.fromEntries(
                first.Outputs?.map((o) => [o.OutputKey!, o.OutputValue!]) || []
              ),
              errors: isFailed(first.StackStatus) ? errors : {},
            };
          }
        }
      }
    } catch (ex: any) {
      if (ex.message.includes("does not exist")) {
        bus.publish("stack.status", {
          stackID: stack,
          status: "DELETE_COMPLETE",
        });
        return {
          status: "DELETE_COMPLETE",
          outputs: {} as Record<string, string>,
          errors: {} as Record<string, string>,
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export type StackDeploymentResult = Awaited<ReturnType<typeof monitor>>;
