import { useBus } from "../bus.js";
import { useAWSProvider } from "../credentials.js";
import { Logger } from "../logger.js";
import type { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import { isFailed, monitor, StackDeploymentResult } from "./monitor.js";

export async function publishAssets(stacks: CloudFormationStackArtifact[]) {
  // TODO: use memo in cloudformation-deployments.ts
  Logger.debug("Publishing assets");
  const provider = await useAWSProvider();
  const { CloudFormationDeployments } = await import(
    "../cdk/cloudformation-deployments.js"
  );
  const { publishAssets } = await import(
    "../cdk/cloudformation-deployments-wrapper.js"
  );
  const deployment = new CloudFormationDeployments({
    sdkProvider: provider,
  });

  for (const stack of stacks) {
    await publishAssets(
      deployment,
      {
        stack: stack as any,
        quiet: true,
        deploymentMethod: {
          method: "direct",
        },
      }
    );
  }
}

export async function deployMany(stacks: CloudFormationStackArtifact[]) {
  Logger.debug(
    "Deploying stacks",
    stacks.map((s) => s.stackName)
  );
  const { CloudFormationStackArtifact } = await import("aws-cdk-lib/cx-api");
  await useAWSProvider();
  const bus = useBus();
  const complete = new Set<string>();
  const todo = new Set(stacks.map((s) => s.id));

  const results: Record<string, StackDeploymentResult> = {};

  return new Promise<typeof results>((resolve) => {
    async function trigger() {
      for (const stack of stacks) {
        if (!todo.has(stack.id)) continue;
        Logger.debug("Checking if", stack.id, "is ready to deploy");

        if (
          stack.dependencies.some(
            (dep) =>
              dep instanceof CloudFormationStackArtifact &&
              !complete.has(dep.id) &&
              stacks.some((s) => s.id === dep.id)
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
                  outputs: {},
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
        outputs: result.outputs,
        status: "SKIPPED",
      };
    }
    bus.publish("stack.updated", {
      stackID: stack.stackName,
    });
    return monitor(stack.stackName);
  } catch (ex: any) {
    Logger.debug("Failed to deploy stack", stack.id, ex);
    if (ex.message === "No updates are to be performed.") {
      return monitor(stack.stackName);
    }
    bus.publish("stack.status", {
      stackID: stack.stackName,
      status: "UPDATE_FAILED",
    });
    return {
      errors: {
        stack: ex.message,
      },
      outputs: {},
      status: "UPDATE_FAILED",
    };
  }
}
