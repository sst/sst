import React, { useState, useEffect } from "react";
import type { StackEvent, StackResource } from "@aws-sdk/client-cloudformation";
import { Box, Text } from "ink";
import { useBus } from "../../bus.js";
import { Stacks } from "../../stacks/index.js";
import inkSpinner from "ink-spinner";
import { useProject } from "../../project.js";
import { blue, bold, dim, green, red } from "colorette";
import { Colors } from "../colors.js";
import { CloudAssembly } from "aws-cdk-lib/cx-api";

// @ts-ignore
const { default: Spinner } = inkSpinner;

interface Props {
  stacks: string[];
}
export const DeploymentUI = (props: Props) => {
  const [stacks, setStacks] = useState<Record<string, string>>(
    Object.fromEntries(props.stacks.map((s) => [s, ""]))
  );

  const [resources, setResources] = useState<Record<string, StackResource[]>>(
    {}
  );

  const [resources2, setResources2] = useState<Record<string, StackEvent>>({});

  useEffect(() => {
    console.log(`  ${Colors.primary(`➜`)}  ${bold(dim(`Deploying...`))}`);
    const bus = useBus();

    const update = bus.subscribe("stack.updated", (payload) => {
      setStacks((prev) => ({
        ...prev,
        [payload.properties.stackID]: "",
      }));
    });

    const status = bus.subscribe("stack.status", (payload) => {
      setStacks((prev) => ({
        ...prev,
        [payload.properties.stackID]: payload.properties.status,
      }));
    });

    const event = bus.subscribe("stack.event", (payload) => {
      const { event } = payload.properties;
      if (event.ResourceType === "AWS::CloudFormation::Stack") return;
      setResources2((previous) => {
        if (Stacks.isFinal(event.ResourceStatus!)) {
          console.log(
            dim(
              `     ${event.StackName} ${event.ResourceType} ${event.LogicalResourceId}`
            ),
            Stacks.isFailed(event.ResourceStatus!)
              ? Colors.danger(event.ResourceStatus!)
              : dim(event.ResourceStatus!)
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
      bus.unsubscribe(update);
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
      {Object.entries(resources2).map(([_, evt]) => {
        return (
          <Box key={evt.LogicalResourceId}>
            <Text>
              {"  "}
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
      {/*
      <Box>
        <Text>
          {"     "}
          <Spinner />
          <Text dimColor> Polling for updates </Text>
        </Text>
      </Box>
      */}
      <Box />
    </Box>
  );
};

export function printDeploymentResults(
  assembly: CloudAssembly,
  results: Awaited<ReturnType<typeof Stacks.deployMany>>
) {
  console.log();

  console.log(`  ${green(`✔`)}  ${bold(dim(`Deployed:`))}`);
  for (const [stack, result] of Object.entries(results)) {
    const outputs = Object.entries(result.outputs).filter(([key, _]) => {
      if (key.startsWith("Export")) return false;
      if (key.includes("SstSiteEnv")) return false;
      if (key === "SstMetadata") return false;
      return true;
    });
    console.log(`     ${dim(stack)}`);
    if (outputs.length > 0) {
      for (const key of Object.keys(Object.fromEntries(outputs)).sort()) {
        const value = result.outputs[key];
        console.log(`     ${bold(dim(key))}: ${value}`);
      }
    }
  }
  console.log();

  if (Object.values(results).flatMap((s) => Object.keys(s.errors)).length) {
    console.log(`  ${red(`✖`)}  ${bold(dim(`Errors:`))}`);
    for (const [stack, result] of Object.entries(results)) {
      const hasErrors = Object.entries(result.errors).length > 0;
      if (!hasErrors) continue;
      console.log(`     ${dim(stack)}`);
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

        console.log(`     ${bold(red(readable))}: ${error}`);
      }
      console.log();
    }
  }
}
