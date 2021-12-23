import { useMemo } from "react";
import {
  flatMap,
  groupBy,
  map,
  mapValues,
  pipe,
  toPairs,
  uniqBy,
} from "remeda";
import { Spacer } from "~/components";
import { Stack } from "~/components/Stack";
import { useConstructsByType } from "~/data/aws/stacks";
import { useRealtimeState } from "~/data/global";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import { InvocationRow } from "../Functions/Invocation";

const Root = styled("div", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  "& > *:last-child": {
    borderTop: "1px solid $border",
  },
});
const Invocations = styled("div", {
  padding: "$xl",
  overflowY: "scroll",
  flexGrow: 1,
});

export function Local() {
  const [state] = useRealtimeState();
  const warmed = useConstructsByType("Function")!.filter(
    (fn) => state.functions[fn.data.localId]?.warm
  );

  const invocations = warmed
    .map((metadata) => ({
      metadata,
      state: state.functions[metadata.data.localId],
    }))
    .flatMap((x) =>
      x.state.invocations.map((i) => ({
        ...x,
        invocation: i,
      }))
    )
    .sort((a, b) => b.invocation.times.start - a.invocation.times.start);

  // Merge all issues from each function together and dedupe
  const issues = useMemo(() => {
    return pipe(
      warmed,
      map((x) => state.functions[x.data.localId].issues),
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
      <Invocations>
        <H3>Invocations</H3>
        <Spacer vertical="xl" />
        <Stack space="xl">
          {invocations.map((item) => (
            <InvocationRow
              showFunctionName
              metadata={item.metadata}
              invocation={item.invocation}
            />
          ))}
        </Stack>
      </Invocations>
    </Root>
  );
}
