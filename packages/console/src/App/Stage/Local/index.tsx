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
import { EmptyState, Spacer } from "~/components";
import { Stack } from "~/components/Stack";
import { useConstructsByType } from "~/data/aws/stacks";
import { useRealtimeState } from "~/data/global";
import { styled } from "~/stitches.config";
import { Empty, H1, Header, HeaderTitle } from "../components";
import { InvocationRow } from "../Functions/Invocation";
import { Issues } from "../Functions/Issues";

const Invocations = styled("div", {
  padding: "$lg",
});

export function Local() {
  const functions = useRealtimeState((s) => s.functions);
  const warmed = useConstructsByType("Function")!.filter(
    (fn) => functions[fn.data.localId]?.warm
  );

  const invocations = warmed
    .map((metadata) => ({
      metadata,
      state: functions[metadata.data.localId],
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
      map((x) => functions[x.data.localId].issues),
      flatMap(toPairs),
      flatMap((x) => x[1].map((val) => [x[0], val] as const)),
      groupBy((x) => x[0]),
      mapValues((x) => x.map((i) => i[1])),
      mapValues((x) => uniqBy(x, (v) => v.location.file))
    );
  }, [warmed]);

  return (
    <>
      <Header>
        <HeaderTitle>Invocations</HeaderTitle>
      </Header>
      {invocations.length === 0 && <Empty>Waiting for invocations...</Empty>}
      <Invocations>
        <Stack space="0" alignHorizontal="start">
          {invocations.map((item) => (
            <InvocationRow
              key={item.invocation.id}
              showSource
              metadata={item.metadata}
              invocation={item.invocation}
            />
          ))}
        </Stack>
      </Invocations>
      {issues.build?.length > 0 && <Issues issues={issues.build || []} />}
    </>
  );
}
