import React, { useState, useEffect, useLayoutEffect } from "react";
import type { StackResource } from "@aws-sdk/client-cloudformation";
import { Box, Text } from "ink";
import { useBus } from "../../bus.js";
import { Stacks } from "../../stacks/index.js";
import inkSpinner from "ink-spinner";
import { useProject } from "../../app.js";

// @ts-ignore
const { default: Spinner } = inkSpinner;

const FullScreen: React.FC = (props) => {
  const [size, setSize] = useState({
    columns: process.stdout.columns,
    rows: process.stdout.rows,
  });

  useEffect(() => {
    function onResize() {
      setSize({
        columns: process.stdout.columns,
        rows: process.stdout.rows,
      });
    }

    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  return (
    <Box width={size.columns} height={size.rows} flexDirection="column">
      {props.children}
    </Box>
  );
};

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

  useEffect(() => {
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

    const resourcesSub = bus.subscribe("stack.resources", (payload) => {
      setResources((previous) => {
        const existing = previous[payload.properties.stackID] || [];
        const filtered = (payload.properties.resources || []).filter((r) => {
          if (existing.some((p) => p.LogicalResourceId === r.LogicalResourceId))
            return true;
          if (!Stacks.isFinal(r.ResourceStatus as any)) return true;
          return false;
        });
        return {
          ...previous,
          [payload.properties.stackID]: filtered,
        };
      });
    });

    return () => {
      bus.unsubscribe(resourcesSub);
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
    <FullScreen>
      <Text>
        Deploying <Text color="bold">{props.stacks.length}</Text> stacks for
        stage <Text color="blue">{useProject().stage}</Text>
      </Text>
      {Object.entries(stacks).map(([stackID, status]) => {
        return (
          <React.Fragment key={stackID}>
            <Text>
              {!Stacks.isFinal(status) && <Spinner />}
              {Stacks.isSuccess(status) && <Text color={color(status)}>✔</Text>}
              {Stacks.isFailed(status) && <Text color={color(status)}>✖</Text>}
              <Text>{" " + stackID}</Text>
              {status && <Text color={color(status)}> {status}</Text>}
            </Text>
            {resources[stackID]?.map((resource) => (
              <Box key={resource.LogicalResourceId}>
                <Text>
                  {"  "}
                  {!Stacks.isFinal(resource.ResourceStatus || "") && (
                    <Spinner />
                  )}
                  {Stacks.isSuccess(resource.ResourceStatus || "") && (
                    <Text color="green">✔</Text>
                  )}
                  {Stacks.isFailed(resource.ResourceStatus || "") && (
                    <Text color="red">✖</Text>
                  )}{" "}
                  {resource.ResourceType} {resource.LogicalResourceId}{" "}
                  {resource.ResourceStatusReason}
                </Text>
                <Text color={color(resource.ResourceStatus || "")}>
                  {resource.ResourceStatus}
                </Text>
              </Box>
            ))}
          </React.Fragment>
        );
      })}
    </FullScreen>
  );
};
