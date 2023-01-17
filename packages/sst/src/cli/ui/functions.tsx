import { dim } from "colorette";
import { existsSync } from "fs";
import { Box, Text } from "ink";
import inkSpinner from "ink-spinner";
import React, { useEffect, useState } from "react";
import { useBus, Events } from "../../bus.js";
import { useFunctions } from "../../constructs/Function.js";
import { Colors } from "../colors.js";
// @ts-ignore
const { default: Spinner } = inkSpinner;

interface Pending {
  requestID: string;
  functionID: string;
  started: number;
  logs: string[];
}

export function Functions() {
  const [functions, setFunctions] = useState<Record<string, Pending>>({});
  useEffect(() => {
    const bus = useBus();

    const invoke = bus.subscribe("function.invoked", (evt) => {
      setFunctions((functions) => {
        return {
          ...functions,
          [evt.properties.requestID]: {
            requestID: evt.properties.requestID,
            functionID: evt.properties.functionID,
            started: Date.now(),
            logs: [],
          },
        };
      });
    });

    const stdout = bus.subscribe("worker.stdout", (evt) => {
      setFunctions((functions) => {
        const existing = functions[evt.properties.requestID];
        if (!existing) return functions;
        return {
          ...functions,
          [evt.properties.requestID]: {
            ...existing,
            logs: [...existing.logs, evt.properties.message],
          },
        };
      });
    });

    const success = bus.subscribe("function.success", (evt) => {
      setFunctions((functions) => {
        const { [evt.properties.requestID]: existing, ...next } = functions;
        setTimeout(() => {
          console.log(
            Colors.primary(`  ➜ `),
            useFunctions().fromID(existing.functionID).handler!
          );
          for (const log of existing.logs) {
            console.log(`     ${dim(log)}`);
          }
          console.log(
            `     ${dim(`Done in ${Date.now() - existing.started}ms`)}`
          );
          console.log();
        }, 0);
        return next;
      });
    });

    const error = bus.subscribe("function.error", (evt) => {
      setFunctions((functions) => {
        const { [evt.properties.requestID]: existing, ...next } = functions;
        setTimeout(() => {
          console.log(
            Colors.primary(`  ➜ `),
            useFunctions().fromID(existing.functionID).handler!
          );
          for (const log of existing.logs) {
            console.log(`     ${dim(log)}`);
          }
          console.log(`     ${Colors.danger(evt.properties.errorMessage)}`);
          for (const line of evt.properties.trace || []) {
            console.log(`     ${dim(line)}`);
          }
          console.log();
        }, 0);
        return next;
      });
    });

    return () => {
      bus.unsubscribe(invoke);
      bus.unsubscribe(success);
      bus.unsubscribe(error);
      bus.unsubscribe(stdout);
    };
  }, []);

  return (
    <>
      {Object.values(functions).map((evt) => (
        <React.Fragment key={evt.requestID}>
          <Box>
            <Text>
              {"  "}
              <Spinner />
              {"  "}
              {useFunctions().fromID(evt.functionID).handler!}
            </Text>
          </Box>
          {evt.logs.map((log, index) => (
            <Box key={index}>
              <Text dimColor>
                {"     "}
                {log}
              </Text>
            </Box>
          ))}
          <Text />
        </React.Fragment>
      ))}
    </>
  );
}
