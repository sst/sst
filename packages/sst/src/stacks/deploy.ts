import { useBus } from "../bus.js";
import { useProject } from "../project.js";
import { useAWSClient, useAWSProvider } from "../credentials.js";
import { Logger } from "../logger.js";
import type { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import {
  filterOutputs,
  isFailed,
  monitor,
  StackDeploymentResult,
} from "./monitor.js";
import { VisibleError } from "../error.js";

export async function publishAssets(stacks: CloudFormationStackArtifact[]) {
  Logger.debug("Publishing assets");
  const provider = await useAWSProvider();
  const { publishDeployAssets } = await import("../cdk/deployments-wrapper.js");

  const results: Record<string, any> = {};
  for (const stack of stacks) {
    const result = await publishDeployAssets(provider, {
      stack: stack as any,
      quiet: false,
      deploymentMethod: {
        method: "direct",
      },
    });
    results[stack.stackName] = result;
  }
  return results;
}

export async function deployMany(stacks: CloudFormationStackArtifact[]) {
  if (stacks.length === 0) {
    throw new VisibleError("No stacks to deploy");
  }
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
  const { cdk } = useProject().config;
  Logger.debug("Deploying stack", stack.id);
  const provider = await useAWSProvider();
  const { Deployments } = await import("../cdk/deployments.js");
  const deployment = new Deployments({ sdkProvider: provider });
  const stackTags = Object.entries(stack.tags ?? {}).map(([Key, Value]) => ({
    Key,
    Value,
  }));
  try {
    await addInUseExports(stack);
    const result = await deployment.deployStack({
      stack: stack as any,
      quiet: true,
      tags: stackTags,
      deploymentMethod: {
        method: "direct",
      },
      toolkitStackName: cdk?.toolkitStackName,
    });
    if (result?.noOp) {
      bus.publish("stack.status", {
        stackID: stack.stackName,
        status: "SKIPPED",
      });
      return {
        errors: {},
        outputs: filterOutputs(result.outputs),
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

async function addInUseExports(stack: CloudFormationStackArtifact) {
  // Get old outputs
  const oldOutputs = await getCloudFormationStackOutputs(stack);
  if (!oldOutputs) return;

  // Get new exports
  // note: that we only want to handle outputs exported by CDK.
  // ie.
  // "Outputs": {
  //   "ExportsOutputRefauthUserPoolA78B038B8D9965B5": {
  //     "Value": {
  //       "Ref": "authUserPoolA78B038B"
  //     },
  //     "Export": {
  //       "Name": "frank-acme-auth:ExportsOutputRefauthUserPoolA78B038B8D9965B5"
  //     }
  //   },
  const newTemplate = JSON.parse(await getLocalTemplate(stack));
  const newOutputs = newTemplate.Outputs || {};
  const newExportNames = Object.keys(newOutputs)
    .filter((outputKey) => outputKey.startsWith("ExportsOutput"))
    .filter((outputKey) => newOutputs[outputKey].Export)
    .map((outputKey) => newOutputs[outputKey].Export.Name);

  // Add missing exports
  // ie.
  // Outputs [{
  //   OutputKey: (String)
  //   OutputValue: (String)
  //   Description: (String)
  //   ExportName: (String)
  // }]
  let isDirty = false;
  await Promise.all(
    oldOutputs
      .filter((output) => output.OutputKey?.startsWith("ExportsOutput"))
      .filter((output) => output.ExportName)
      // filter exports not in the new template (ie. CloudFormation will be removing)
      .filter((output) => !newExportNames.includes(output.ExportName))
      // filter the exports still in-use by other stacks
      .map(async (output) => {
        const imports = await listImports(output.ExportName!);
        // update template
        if (imports.length > 0) {
          Logger.debug(
            `deploy stack: addInUseExports: export ${
              output.ExportName
            } used in ${imports.join(", ")}`
          );
          newTemplate.Outputs = newTemplate.Outputs || {};
          newTemplate.Outputs[output.OutputKey!] = {
            Description: `Output added by SST b/c exported value still used in ${imports.join(
              ", "
            )}`,
            Value: output.OutputValue,
            Export: {
              Name: output.ExportName,
            },
          };
          isDirty = true;
        }
      })
  );

  // Save new template
  if (isDirty) {
    await saveLocalTemplate(stack, JSON.stringify(newTemplate, null, 2));
  }
}

async function getCloudFormationStackOutputs(
  stack: CloudFormationStackArtifact
) {
  const { CloudFormationClient, DescribeStacksCommand } = await import(
    "@aws-sdk/client-cloudformation"
  );
  const client = useAWSClient(CloudFormationClient);
  try {
    const { Stacks: stacks } = await client.send(
      new DescribeStacksCommand({
        StackName: stack.id,
      })
    );
    if (!stacks || stacks.length === 0) return;
    return stacks[0].Outputs || [];
  } catch (e: any) {
    if (
      e.name === "ValidationError" &&
      e.message.includes("Stack with id") &&
      e.message.includes("does not exist")
    ) {
      return;
    } else {
      throw e;
    }
  }
}

async function listImports(exportName: string) {
  const { CloudFormationClient, ListImportsCommand } = await import(
    "@aws-sdk/client-cloudformation"
  );
  const client = useAWSClient(CloudFormationClient);
  try {
    const ret = await client.send(
      new ListImportsCommand({
        ExportName: exportName,
      })
    );
    return ret.Imports || [];
  } catch (e: any) {
    if (
      e.name === "ValidationError" &&
      e.message.includes("is not imported by any stack")
    ) {
      return [];
    }
    throw e;
  }
}

async function getLocalTemplate(stack: CloudFormationStackArtifact) {
  const fs = await import("fs/promises");
  const fileContent = await fs.readFile(stack.templateFullPath);
  return fileContent.toString();
}

async function saveLocalTemplate(
  stack: CloudFormationStackArtifact,
  content: string
) {
  const fs = await import("fs/promises");
  await fs.writeFile(stack.templateFullPath, content);
}
