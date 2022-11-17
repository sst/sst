import {
  CloudFormationClient,
  DeleteStackCommand,
} from "@aws-sdk/client-cloudformation";
import type { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import { useBus } from "../bus.js";
import { useAWSClient, useAWSProvider } from "../credentials.js";
import { Logger } from "../logger.js";
import { StackDeploymentResult, monitor } from "./monitor.js";

export async function remove(
  stack: CloudFormationStackArtifact
): Promise<StackDeploymentResult> {
  const bus = useBus();
  Logger.debug("Removing stack", stack.id);
  const cfn = useAWSClient(CloudFormationClient);
  try {
    await cfn.send(
      new DeleteStackCommand({
        StackName: stack.stackName,
      })
    );
    bus.publish("stack.updated", {
      stackID: stack.stackName,
    });
    return monitor(stack.stackName);
  } catch (ex: any) {
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
