import { CloudAssembly } from "aws-cdk-lib/cx-api";
import { useBus } from "../../bus/index.js";
import { Stacks } from "../../stacks/index.js";
import React, { useState, useEffect } from "react";
import { Box, render, Text } from "ink";
import inkSpinner from "ink-spinner";
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

    return () => {
      bus.unsubscribe(update);
      bus.unsubscribe(status);
    };
  }, []);

  return (
    <FullScreen>
      <Text>Deploying {props.stacks.length} stacks</Text>
      {Object.entries(stacks).map(([stackID, status]) => (
        <Text key={stackID}>
          <Text> </Text>
          {!Stacks.isFinal(status) ? <Spinner /> : <Text color="green">✔</Text>}
          <Text>{" " + stackID}</Text>
          <Text color={Stacks.isFinal(status) ? "green" : "yellow"}>
            {" " + status}
          </Text>
        </Text>
      ))}
    </FullScreen>
  );
};

interface DeployOpts {
  from?: string;
}

export async function Deploy(opts: DeployOpts) {
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

  const component = render(<DeploymentUI />);
  await Stacks.deployMany(assembly.stacks);
  component.unmount();
}
