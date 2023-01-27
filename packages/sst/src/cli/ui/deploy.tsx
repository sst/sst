import React, { useState, useEffect } from "react";
import type { StackEvent, StackResource } from "@aws-sdk/client-cloudformation";
import { Box, Text } from "ink";
import { useBus } from "../../bus.js";
import { Stacks } from "../../stacks/index.js";
import inkSpinner from "ink-spinner";
import { Colors } from "../colors.js";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import { useProject } from "../../project.js";

// @ts-ignore
const { default: Spinner } = inkSpinner;

interface Props {
  assembly: CloudAssembly;
}
export const DeploymentUI = (props: Props) => {
  const [resources, setResources] = useState<Record<string, StackEvent>>({});

  useEffect(() => {
    Colors.gap();
    const bus = useBus();

    const event = bus.subscribe("stack.event", (payload) => {
      const { event } = payload.properties;
      if (event.ResourceType === "AWS::CloudFormation::Stack") return;
      setResources((previous) => {
        if (Stacks.isFinal(event.ResourceStatus!)) {
          const readable = logicalIdToCdkPath(
            props.assembly,
            event.StackName!,
            event.LogicalResourceId!
          );
          Colors.line(
            Colors.warning(Colors.prefix),
            readable
              ? Colors.dim(
                  `${stackNameToId(event.StackName!)} ${readable} ${
                    event.ResourceType
                  }`
                )
              : Colors.dim(
                  `${stackNameToId(event.StackName!)} ${event.ResourceType}`
                ),
            Stacks.isFailed(event.ResourceStatus!)
              ? Colors.danger(event.ResourceStatus!)
              : Colors.dim(event.ResourceStatus!)
          );
          const { [event.LogicalResourceId!]: _, ...next } = previous;
          return next;
        }

        return {
          ...previous,
          [payload.properties.event.LogicalResourceId!]:
            payload.properties.event,
        };
      });
    });

    return () => {
      bus.unsubscribe(event);
    };
  }, []);

  function color(status: string) {
    if (Stacks.isFailed(status)) return "red";
    if (Stacks.isSuccess(status)) return "green";
    return "yellow";
  }

  return (
    <Box flexDirection="column">
      {Object.entries(resources)
        .slice(0, process.stdout.rows - 2)
        .map(([_, evt], index) => {
          const readable = logicalIdToCdkPath(
            props.assembly,
            evt.StackName!,
            evt.LogicalResourceId!
          );
          return (
            <Box key={index}>
              <Text>
                <Spinner />
                {"  "}
                {readable
                  ? `${stackNameToId(evt.StackName!)} ${readable} ${
                      evt.ResourceType
                    }`
                  : `${stackNameToId(evt.StackName!)} ${evt.ResourceType}`}{" "}
              </Text>
              <Text color={color(evt.ResourceStatus || "")}>
                {evt.ResourceStatus}
              </Text>
            </Box>
          );
        })}
      {Object.entries(resources).length === 0 && (
        <Box>
          <Text>
            <Spinner />
            {"  "}
            <Text dimColor>Deploying...</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};

export function printDeploymentResults(
  assembly: CloudAssembly,
  results: Awaited<ReturnType<typeof Stacks.deployMany>>,
  remove?: boolean
) {
  // Print success stacks
  const success = Object.entries(results).filter(
    ([_stack, result]) => Object.keys(result.errors).length === 0
  );
  if (success.length) {
    Colors.gap();
    Colors.line(
      Colors.success(`✔`),
      Colors.bold(remove ? `  Removed:` : ` Deployed:`)
    );
    for (const [stack, result] of success) {
      const outputs = Object.entries(result.outputs).filter(
        ([key, _]) => !key.includes("SstSiteEnv")
      );
      Colors.line(`   ${Colors.dim(stackNameToId(stack))}`);
      if (outputs.length > 0) {
        for (const key of Object.keys(Object.fromEntries(outputs)).sort()) {
          const value = result.outputs[key];
          Colors.line(`   ${Colors.bold.dim(key + ":")} ${value}`);
        }
      }
    }
    Colors.gap();
  }

  // Print failed stacks
  const failed = Object.entries(results).filter(
    ([_stack, result]) => Object.keys(result.errors).length > 0
  );
  if (failed.length) {
    Colors.gap();
    Colors.line(`${Colors.danger(`✖`)}  ${Colors.bold.dim(`Errors`)}`);
    for (const [stack, result] of failed) {
      Colors.line(`   ${Colors.dim(stackNameToId(stack))}`);
      for (const [id, error] of Object.entries(result.errors)) {
        const readable = logicalIdToCdkPath(assembly, stack, id) || id;
        Colors.line(`   ${Colors.danger.bold(readable + ":")} ${error}`);
        const helper = getHelper(error);
        if (helper) {
          Colors.line(`   ${Colors.warning.bold("⮑  Hint:")} ${helper}`);
        }
      }
    }
    Colors.gap();
  }
}

function stackNameToId(stack: string) {
  const project = useProject();
  const prefix = `${project.config.stage}-${project.config.name}-`;
  return stack.startsWith(prefix) ? stack.substring(prefix.length) : stack;
}

function logicalIdToCdkPath(
  assembly: CloudAssembly,
  stack: string,
  logicalId: string
) {
  const found = Object.entries(
    assembly.manifest.artifacts?.[stack].metadata || {}
  ).find(
    ([_key, value]) =>
      value[0]?.type === "aws:cdk:logicalId" && value[0]?.data === logicalId
  )?.[0];

  if (!found) {
    return;
  }

  return found.split("/").filter(Boolean).slice(1, -1).join("/");
}

function getHelper(error: string) {
  return (
    getApiAccessLogPermissionsHelper(error) ||
    getAppSyncMultiResolverHelper(error) ||
    getApiLogRoleHelper(error)
  );
}

function getApiAccessLogPermissionsHelper(error: string) {
  // Can run into this issue when enabling access logs for API Gateway
  // note: this should be handled in SST as access log group names are now
  //       hardcoded with /aws/vendedlogs/apis prefix.
  if (error.indexOf("Insufficient permissions to enable logging") > -1) {
    return `This is a common deploy error. Check out this GitHub issue for more details - https://github.com/serverless-stack/sst/issues/125`;
  }
}

function getAppSyncMultiResolverHelper(error: string) {
  // Can run into this issue when updating an AppSyncApi resolver
  if (
    error.indexOf(
      "Only one resolver is allowed per field. (Service: AWSAppSync"
    ) > -1
  ) {
    return `This is a common error for deploying AppSync APIs. Check out this GitHub issue for more details - https://github.com/aws/aws-cdk/issues/13269`;
  }
}

function getApiLogRoleHelper(error: string) {
  // Can run into this issue when enabling access logs for WebSocketApi
  if (
    error.indexOf(
      "CloudWatch Logs role ARN must be set in account settings to enable logging (Service: AmazonApiGatewayV2"
    ) > -1
  ) {
    return `This is a common error when configuring Access Log for WebSocket APIs. The AWS API Gateway service in your AWS account does not have permissions to the CloudWatch logs service. Follow this article to create an IAM role for logging to CloudWatch - https://aws.amazon.com/premiumsupport/knowledge-center/api-gateway-cloudwatch-logs/`;
  }
}
