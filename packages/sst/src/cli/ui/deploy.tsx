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
    Colors.line(`${Colors.primary(`➜`)}  ${Colors.bold(`Deploying...`)}`);
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
      {Object.entries(resources).map(([_, evt]) => {
        const readable = logicalIdToCdkPath(
          props.assembly,
          evt.StackName!,
          evt.LogicalResourceId!
        );
        return (
          <Box key={evt.LogicalResourceId}>
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
            <Text dimColor>Waiting...</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};

export function printDeploymentResults(
  assembly: CloudAssembly,
  results: Awaited<ReturnType<typeof Stacks.deployMany>>
) {
  // Print success stacks
  const success = Object.entries(results).filter(
    ([_stack, result]) => Object.keys(result.errors).length === 0
  );
  if (success.length) {
    Colors.gap();
    Colors.line(Colors.success(`✔`), Colors.bold(` Deployed:`));
    for (const [stack, result] of success) {
      const outputs = Object.entries(result.outputs).filter(([key, _]) => {
        if (key.startsWith("Export")) return false;
        if (key.includes("SstSiteEnv")) return false;
        if (key === "SSTMetadata") return false;
        return true;
      });
      Colors.line(`   ${Colors.dim(stackNameToId(stack))}`);
      if (outputs.length > 0) {
        for (const key of Object.keys(Object.fromEntries(outputs)).sort()) {
          const value = result.outputs[key];
          Colors.line(`   ${Colors.bold.dim(key + ":")} ${value}`);
        }
      }
    }
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
