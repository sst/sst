import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
  DescribeStackResourcesOutput,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { useBus } from "../bus/index.js";
import { useAWSClient, useAWSProvider } from "../credentials/index.js";
import { Logger } from "../logger/index.js";
import type { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";

const STATUSES = [
  "CREATE_COMPLETE",
  "CREATE_IN_PROGRESS",
  "CREATE_FAILED",
  "DELETE_COMPLETE",
  "DELETE_FAILED",
  "DELETE_IN_PROGRESS",
  "REVIEW_IN_PROGRESS",
  "ROLLBACK_COMPLETE",
  "ROLLBACK_FAILED",
  "ROLLBACK_IN_PROGRESS",
  "UPDATE_COMPLETE",
  "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS",
  "UPDATE_IN_PROGRESS",
  "UPDATE_ROLLBACK_COMPLETE",
  "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS",
  "UPDATE_ROLLBACK_FAILED",
  "UPDATE_ROLLBACK_IN_PROGRESS",
] as const;

const STATUSES_FINAL = [
  "CREATE_FAILED",
  "CREATE_COMPLETE",
  "DELETE_COMPLETE",
  "DELETE_FAILED",
  "ROLLBACK_COMPLETE",
  "ROLLBACK_FAILED",
  "UPDATE_COMPLETE",
  "UPDATE_ROLLBACK_COMPLETE",
  "UPDATE_ROLLBACK_FAILED",
] as const;

const STATUSES_FAILED = [
  "CREATE_FAILED",
  "DELETE_FAILED",
  "ROLLBACK_FAILED",
  "ROLLBACK_COMPLETE",
  "UPDATE_ROLLBACK_COMPLETE",
  "UPDATE_ROLLBACK_FAILED",
];

export function isFinal(input: string) {
  return STATUSES_FINAL.includes(input as any);
}

export function isFailed(input: string) {
  return STATUSES_FAILED.includes(input as any);
}

declare module "../bus" {
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

async function retry<T extends any>(fn: () => Promise<T>) {
  let tries = 0;
  const MAX = 10_000;
  while (true) {
    try {
      const result = await fn();
      return result;
    } catch (ex) {
      console.log(ex);
      tries++;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(2 ** tries * 100, MAX))
      );
    }
  }
}

export async function deployMany(stacks: CloudFormationStackArtifact[]) {
  const { CloudFormationStackArtifact } = await import("aws-cdk-lib/cx-api");
  const bus = useBus();
  const complete = new Set<string>();
  const todo = new Set(stacks.map((s) => s.id));
  const pending = new Set<string>();

  bus.subscribe("stack.updated", (evt) => {
    pending.add(evt.properties.stackID);
  });

  async function trigger() {
    for (const stack of stacks) {
      if (!todo.has(stack.id)) continue;
      Logger.debug("Checking if", stack.id, "is ready to deploy");

      if (
        stack.dependencies.some(
          (dep) =>
            dep instanceof CloudFormationStackArtifact && !complete.has(dep.id)
        )
      )
        continue;

      deploy(stack).then(() => waitFor(stack.stackName));
      todo.delete(stack.id);
    }
  }

  return new Promise<void>(async (resolve) => {
    const finished = bus.subscribe("stack.status", (evt) => {
      if (!isFinal(evt.properties.status as any)) return;
      complete.add(evt.properties.stackID);

      if (isFailed(evt.properties.status as any))
        stacks.forEach((s) => todo.delete(s.stackName));

      if (complete.size === stacks.length) {
        bus.unsubscribe(finished);
        resolve();
      }
      trigger();
    });

    await trigger();
  });
}

export async function waitFor(stack: string) {
  const [cfn, bus] = await Promise.all([
    useAWSClient(CloudFormationClient),
    useBus(),
  ]);

  let lastStatus: string | undefined;
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

    /*
        bus.publish("stack.resources", {
          stackID: stack,
          resources: resources.StackResources,
        });
        */

    const [first] = describe.Stacks || [];
    if (first) {
      if (lastStatus !== first.StackStatus && first.StackStatus) {
        lastStatus = first.StackStatus;
        bus.publish("stack.status", {
          stackID: stack,
          status: first.StackStatus as any,
        });
        if (isFinal(first.StackStatus)) {
          break;
        }
      }
    }
  }
}

export async function deploy(stack: CloudFormationStackArtifact) {
  const bus = useBus();
  Logger.debug("Deploying stack", stack.id);
  const provider = await useAWSProvider();
  const { CloudFormationDeployments } = await import(
    "aws-cdk/lib/api/cloudformation-deployments.js"
  );
  const deployment = new CloudFormationDeployments({
    sdkProvider: provider,
  });
  try {
    const result = await deployment.deployStack({
      stack: stack as any,
      quiet: true,
    });
    bus.publish("stack.updated", {
      stackID: stack.stackName,
    });
  } catch (err) {
    bus.publish("stack.updated", {
      stackID: stack.stackName,
    });
    bus.publish("stack.status", {
      status: "UPDATE_COMPLETE",
      stackID: stack.stackName,
    });
  }
}
