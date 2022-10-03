import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { useBus } from "../bus/index.js";
import { useAWSClient, useAWSProvider } from "../credentials/index.js";
import { Logger } from "../logger/index.js";
import type { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";

declare module "../bus" {
  export interface Events {
    "stacks.updated": {
      stackID: string;
    };
    "stacks.finished": {
      stackID: string;
      status: string;
    };
  }
}

export async function deployMany(stacks: CloudFormationStackArtifact[]) {
  const { CloudFormationStackArtifact } = await import("aws-cdk-lib/cx-api");
  const bus = useBus();
  const complete = new Set<string>();
  const started = new Set<string>();
  const cfn = await useAWSClient(CloudFormationClient);

  const update = bus.subscribe("stacks.updated", (evt) => {
    started.add(evt.properties.stackID);
  });

  async function trigger() {
    for (const stack of stacks) {
      if (started.has(stack.id)) continue;

      if (
        stack.dependencies.some(
          (dep) =>
            dep instanceof CloudFormationStackArtifact && !complete.has(dep.id)
        )
      )
        continue;

      await deploy(stack);
    }
  }

  async function monitor() {
    if (complete.size === stacks.length) return;
    for (const stack of started) {
      if (complete.has(stack)) continue;
      const result = await cfn.send(
        new DescribeStacksCommand({
          StackName: stack,
        })
      );

      const [first] = result.Stacks || [];
      if (first) {
        if (first.StackStatus === "UPDATE_COMPLETE")
          bus.publish("stacks.finished", {
            stackID: stack,
            status: first.StackStatus,
          });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setTimeout(monitor, 1000);
  }

  return new Promise<void>(async (resolve) => {
    const finished = bus.subscribe("stacks.finished", (evt) => {
      complete.add(evt.properties.stackID);
      if (complete.size === stacks.length) {
        bus.unsubscribe(update);
        bus.unsubscribe(finished);
        resolve();
      }
      trigger();
    });

    await trigger();
    monitor();
  });
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
  bus.publish("stacks.updated", {
    stackID: stack.stackName,
  });
  try {
    const result = await deployment.deployStack({
      stack: stack as any,
      quiet: true,
    });
    if (result?.noOp) {
      bus.publish("stacks.finished", {
        stackID: stack.stackName,
        status: "no-op",
      });
    }
  } catch (ex) {
    bus.publish("stacks.finished", {
      stackID: stack.stackName,
      status: "no-op",
    });
  }
}
