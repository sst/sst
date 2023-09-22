import React, { useState, useEffect } from "react";
import type { StackEvent, StackResource } from "@aws-sdk/client-cloudformation";
import { Box, Text } from "ink";
import { useBus } from "../../bus.js";
import { Stacks, STATUSES } from "../../stacks/index.js";
import Spinner from "ink-spinner";
import { Colors } from "../colors.js";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import { useProject } from "../../project.js";

interface Props {
  assembly: CloudAssembly;
  remove?: boolean;
}
export const DeploymentUI = (props: Props) => {
  const [statuses, setStatuses] = useState<
    Record<string, (typeof STATUSES)[number]>
  >({});
  const [resources, setResources] = useState<Record<string, StackEvent>>({});

  useEffect(() => {
    Colors.gap();
    const bus = useBus();

    const status = bus.subscribe("stack.status", (payload) => {
      const { stackID, status } = payload.properties;
      setStatuses((previous) => {
        if (status !== "PUBLISH_ASSETS_IN_PROGRESS") {
          if (previous[stackID]) {
            Colors.line(
              Colors.warning(Colors.prefix),
              Colors.dim(stackNameToId(stackID)),
              Colors.dim("PUBLISH_ASSETS_COMPLETE"),
              ""
            );
          }
          const { [stackID]: _, ...next } = previous;
          return next;
        }

        return {
          ...previous,
          [stackID]: status,
        };
      });
    });

    const event = bus.subscribe("stack.event", (payload) => {
      const { event } = payload.properties;
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
              : Colors.dim(event.ResourceStatus!),
            Stacks.isFailed(event.ResourceStatus!) && event.ResourceStatusReason
              ? event.ResourceStatusReason
              : ""
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
      bus.unsubscribe(status);
    };
  }, []);

  function color(status: string) {
    if (Stacks.isFailed(status)) return "red";
    if (Stacks.isSuccess(status)) return "green";
    return "yellow";
  }

  return (
    <Box flexDirection="column">
      {Object.entries(statuses)
        .slice(0, process.stdout.rows - 2)
        .map(([stack, status], index) => {
          return (
            <Box key={index}>
              <Text>
                <Spinner />
                {"  "}
                {stackNameToId(stack)}{" "}
              </Text>
              <Text color={color(status)}>{status}</Text>
            </Box>
          );
        })}
      {Object.entries(resources)
        .slice(
          0,
          Math.max(0, process.stdout.rows - Object.entries(statuses).length - 2)
        )
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
      {Object.entries(resources).length === 0 &&
        Object.entries(statuses).length === 0 && (
          <Box>
            <Text>
              <Spinner />
              {"  "}
              <Text dimColor>
                {props.remove ? "Removing..." : "Deploying..."}
              </Text>
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
  const success = Object.entries(results).filter(([_stack, result]) =>
    Stacks.isSuccess(result.status)
  );
  if (success.length) {
    Colors.gap();
    Colors.line(
      Colors.success(`✔`),
      Colors.bold(remove ? ` Removed:` : ` Deployed:`)
    );
    for (const [stack, result] of success) {
      Colors.line(`   ${Colors.dim(stackNameToId(stack))}`);
      for (const key of Object.keys(result.outputs).sort()) {
        const value = result.outputs[key];
        Colors.line(`   ${Colors.bold.dim(key + ":")} ${value}`);
      }
    }
    Colors.gap();
  }

  // Print failed stacks
  const failed = Object.entries(results).filter(([_stack, result]) =>
    Stacks.isFailed(result.status)
  );
  if (failed.length) {
    Colors.gap();
    Colors.line(`${Colors.danger(`✖`)}  ${Colors.bold.dim(`Errors`)}`);
    for (const [stack, result] of failed) {
      Colors.line(
        `   ${Colors.dim(stackNameToId(stack))} ${Colors.dim(result.status)}`
      );
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
    assembly.manifest.artifacts?.[stack]?.metadata || {}
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
    getCloudFrontBehaviorLimitHelper(error) ||
    getApiAccessLogPermissionsHelper(error) ||
    getAppSyncMultiResolverHelper(error) ||
    getApiLogRoleHelper(error)
  );
}

function getCloudFrontBehaviorLimitHelper(error: string) {
  if (
    error.indexOf(
      "Your request contains more CacheBehaviors than are allowed per distribution."
    ) > -1
  ) {
    return `This error often occurs when deploying a frontend with a large number of top-level files and folders in the assets directory. Check out this doc on how to resolve the issue - https://docs.sst.dev/known-issues#cloudfront-cachebehaviors-limit-exceeded`;
  }
}

function getApiAccessLogPermissionsHelper(error: string) {
  // Can run into this issue when enabling access logs for API Gateway
  // note: this should be handled in SST as access log group names are now
  //       hardcoded with /aws/vendedlogs/apis prefix.
  if (error.indexOf("Insufficient permissions to enable logging") > -1) {
    return `This is a common deploy error. Check out this GitHub issue for more details - https://github.com/sst/sst/issues/125`;
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
