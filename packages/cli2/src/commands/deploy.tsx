import { CloudAssembly } from "aws-cdk-lib/cx-api";
import { useBus } from "../bus/index.js";
import { Stacks } from "../stacks/index.js";
import React, { useState, useEffect } from "react";
import { render, Text } from "ink";
import inkSpinner from "ink-spinner";
// @ts-ignore
const { default: Spinner } = inkSpinner;

const Counter = () => {
  const [stacks, setStacks] = useState<Record<string, string>>({});
  const [resources, setResources] = useState<Record<string, any>>({});

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
    <>
      {Object.entries(stacks).map(([stackID, status]) => (
        <Text key={stackID}>
          {!Stacks.isFinal(status) ? <Spinner /> : <Text color="green">✔</Text>}
          <Text>{" " + stackID}</Text>
          <Text color={Stacks.isFinal(status) ? "green" : "yellow"}>
            {" " + status}
          </Text>
        </Text>
      ))}
    </>
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

  const component = render(<Counter />);
  await Stacks.deployMany(assembly.stacks);
  component.unmount();
}
