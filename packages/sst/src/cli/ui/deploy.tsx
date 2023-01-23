import React, { useState, useEffect } from "react";
import type { StackEvent, StackResource } from "@aws-sdk/client-cloudformation";
import { Box, Text } from "ink";
import { useBus } from "../../bus.js";
import { Stacks } from "../../stacks/index.js";
import inkSpinner from "ink-spinner";
import { Colors } from "../colors.js";
import { CloudAssembly } from "aws-cdk-lib/cx-api";

// @ts-ignore
const { default: Spinner } = inkSpinner;

interface Props {
  stacks: string[];
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
          Colors.line(
            Colors.warning(Colors.prefix),
            Colors.dim(
              `${event.StackName} ${event.ResourceType} ${event.LogicalResourceId}`
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
        return (
          <Box key={evt.LogicalResourceId}>
            <Text>
              <Spinner />
              {"  "}
              {evt.StackName} {evt.ResourceType} {evt.LogicalResourceId}{" "}
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
            <Text dimColor>Waiting for changes</Text>
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
  Colors.gap();
  Colors.line(Colors.success(`✔`), Colors.bold(` Deployed`));
  for (const [stack, result] of Object.entries(results)) {
    if (Object.values(result.errors).length) continue;
    const outputs = Object.entries(result.outputs).filter(([key, _]) => {
      if (key.startsWith("Export")) return false;
      if (key.includes("SstSiteEnv")) return false;
      if (key === "SSTMetadata") return false;
      return true;
    });
    Colors.line(`   ${Colors.dim(stack)}`);
    if (outputs.length > 0) {
      for (const key of Object.keys(Object.fromEntries(outputs)).sort()) {
        const value = result.outputs[key];
        Colors.line(`   ${Colors.bold.dim(key)}: ${value}`);
      }
    }
  }
  Colors.gap();

  if (Object.values(results).flatMap((s) => Object.keys(s.errors)).length) {
    Colors.line(`${Colors.danger(`✖`)}  ${Colors.bold.dim(`Errors`)}`);
    for (const [stack, result] of Object.entries(results)) {
      const hasErrors = Object.entries(result.errors).length > 0;
      if (!hasErrors) continue;
      Colors.line(`   ${Colors.dim(stack)}`);
      for (const [id, error] of Object.entries(result.errors)) {
        const found =
          Object.entries(
            assembly.manifest.artifacts?.[stack].metadata || {}
          ).find(
            ([_key, value]) =>
              value[0]?.type === "aws:cdk:logicalId" && value[0]?.data === id
          )?.[0] || "";

        const readable = found
          .split("/")
          .filter(Boolean)
          .slice(1, -1)
          .join("/");

        Colors.line(`  ${Colors.danger.bold(readable)}: ${error}`);
      }
    }
    Colors.gap();
  }
}
