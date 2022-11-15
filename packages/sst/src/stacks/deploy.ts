import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
  DescribeStackResourcesOutput,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { useBus } from "../bus.js";
import { useAWSClient, useAWSProvider } from "../credentials.js";
import { Logger } from "../logger.js";
import type { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";

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

const STATUSES = [
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

export async function deployMany(stacks: CloudFormationStackArtifact[]) {
  const { CloudFormationStackArtifact } = await import("aws-cdk-lib/cx-api");
  await useAWSProvider();
  const bus = useBus();
  const complete = new Set<string>();
  const todo = new Set(stacks.map((s) => s.id));
  const pending = new Set<string>();

  const results: Record<string, StackDeploymentResult> = {};

  bus.subscribe("stack.updated", (evt) => {
    pending.add(evt.properties.stackID);
  });

  return new Promise<typeof results>((resolve) => {
    async function trigger() {
      for (const stack of stacks) {
        if (!todo.has(stack.id)) continue;
        Logger.debug("Checking if", stack.id, "is ready to deploy");

        if (
          stack.dependencies.some(
            (dep) =>
              dep instanceof CloudFormationStackArtifact &&
              !complete.has(dep.id)
          )
        )
          continue;

        deploy(stack).then((result) => {
          results[stack.id] = result;
          complete.add(stack.id);

          if (isFailed(result.status))
            stacks.forEach((s) => {
              if (todo.delete(s.stackName)) {
                complete.add(s.stackName);
                results[s.id] = {
                  status: "DEPENDENCY_FAILED",
                  errors: {},
                };
                bus.publish("stack.status", {
                  stackID: s.id,
                  status: "DEPENDENCY_FAILED",
                });
              }
            });

          if (complete.size === stacks.length) {
            resolve(results);
          }

          trigger();
        });

        todo.delete(stack.id);
      }
    }

    trigger();
  });
}

export async function monitor(stack: string) {
  const [cfn, bus] = await Promise.all([
    useAWSClient(CloudFormationClient),
    useBus(),
  ]);

  let lastStatus: string | undefined;
  const errors: Record<string, string> = {};
  while (true) {
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

    bus.publish("stack.resources", {
      stackID: stack,
      resources: resources.StackResources,
    });

    for (const resource of resources.StackResources || []) {
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
            errors: isFailed(first.StackStatus) ? errors : {},
          };
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

type StackDeploymentResult = Awaited<ReturnType<typeof monitor>>;

export async function deploy(
  stack: CloudFormationStackArtifact
): Promise<StackDeploymentResult> {
  const bus = useBus();
  Logger.debug("Deploying stack", stack.id);
  const provider = await useAWSProvider();
  const { CloudFormationDeployments } = await import(
    "../cdk/cloudformation-deployments.js"
  );
  const deployment = new CloudFormationDeployments({
    sdkProvider: provider,
  });
  try {
    const result = await deployment.deployStack({
      stack: stack as any,
      quiet: true,
      deploymentMethod: {
        method: "direct",
      },
    });
    if (result?.noOp) {
      bus.publish("stack.status", {
        stackID: stack.stackName,
        status: "SKIPPED",
      });
      return {
        errors: {},
        status: "SKIPPED",
      };
    }
    bus.publish("stack.updated", {
      stackID: stack.stackName,
    });
    return monitor(stack.stackName);
  } catch (ex) {
    console.error(ex);
    bus.publish("stack.status", {
      stackID: stack.stackName,
      status: "SKIPPED",
    });
    return {
      errors: {},
      status: "SKIPPED",
    };
  }
}
