import { CloudAssembly } from "aws-cdk-lib/cx-api";
import { useBus } from "../../bus.js";
import { Stacks } from "../../stacks/index.js";
import React, { useState, useEffect } from "react";
import { Box, render, Text } from "ink";
import inkSpinner from "ink-spinner";
import { StackResource } from "@aws-sdk/client-cloudformation";
import { Logger } from "../../logger.js";
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
      <Text>Deploying {props.stacks.length} stacks</Text>
      {Object.entries(stacks).map(([stackID, status]) => {
        return (
          <>
            <Text key={stackID}>
              {!Stacks.isFinal(status) && <Spinner />}
              {Stacks.isSuccess(status) && <Text color={color(status)}>✔</Text>}
              {Stacks.isFailed(status) && <Text color={color(status)}>✖</Text>}
              <Text>{" " + stackID}</Text>
              {status && <Text color={color(status)}> {status}</Text>}
            </Text>
            {resources[stackID]?.map((resource) => (
              <Box>
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
          </>
        );
      })}
    </FullScreen>
  );
};

interface DeployOpts {
  from?: string;
}

export async function deploy(opts: DeployOpts) {
  const assembly = await (async function () {
    if (opts.from) {
      const result = new CloudAssembly(opts.from);
      return result;
    }

    const fn = await Stacks.build();
    return await Stacks.synth({
      fn,
      mode: "deploy",
    });
  })();

  const component = render(<DeploymentUI stacks={[]} />);
  await Stacks.deployMany(assembly.stacks);
  component.unmount();
}
