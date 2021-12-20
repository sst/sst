import { useEffect, useMemo } from "react";
import {
  flatMap,
  flatten,
  groupBy,
  map,
  mapValues,
  pipe,
  toPairs,
  uniqBy,
} from "remeda";
import { Badge, Row, Spacer, Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useConstructsByType, useStacks } from "~/data/aws/stacks";
import { useRealtimeState } from "~/data/global";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import { InvocationRow } from "../Functions/Invocation";

const Root = styled("div", {
  padding: "$xl",
});

export function Local() {
  const [state] = useRealtimeState();
  const warmed = useConstructsByType("Function")!.filter(
    (fn) => state.functions[fn.info.data.localId]?.warm
  );

  const invocations = warmed
    .map((metadata) => ({
      metadata,
      state: state.functions[metadata.info.data.localId],
    }))
    .flatMap((x) =>
      x.state.invocations.map((i) => ({
        ...x,
        invocation: i,
      }))
    )
    .sort((a, b) => b.invocation.times.start - a.invocation.times.start);

  const issues = useMemo(() => {
    return pipe(
      warmed,
      map((x) => state.functions[x.info.data.localId].issues),
      flatMap(toPairs),
      flatMap((x) => x[1].map((val) => [x[0], val] as const)),
      groupBy((x) => x[0]),
      mapValues((x) => x.map((i) => i[1])),
      mapValues((x) => uniqBy(x, (v) => v.id))
    );
  }, [warmed]);
  console.log(JSON.stringify(issues, null, 2));
  return (
    <Root>
      <Stack space="xl">
        <H1>Local</H1>
        <H3>Invocations</H3>
        {invocations.map((item) => (
          <InvocationRow
            metadata={item.metadata.info}
            invocation={item.invocation}
          />
        ))}
      </Stack>
    </Root>
  );
}
