import { Badge, Row, Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useConstructsByType, useStacks } from "~/data/aws/stacks";
import { useRealtimeState } from "~/data/global";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import {
  InvocationLogs,
  InvocationReplay,
  InvocationStatus,
} from "../Functions/Invocation";

const Root = styled("div", {
  padding: "$xl",
});

export function Local() {
  const [state] = useRealtimeState();
  const warmed = useConstructsByType("Function")!.filter(
    (fn) => state.functions[fn.info.data.localId]?.warm
  );

  const list = warmed
    .map((metadata) => ({
      metadata,
      state: state.functions[metadata.info.data.localId],
    }))
    .flatMap((x) =>
      x.state.invocations.map((i) => ({
        ...x,
        invocation: i,
      }))
    );
  return (
    <Root>
      <Stack space="xl">
        <H1>Local</H1>
        <H3>Invocations</H3>
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>Function</Table.Header>
              <Table.Header style={{ width: 120 }}>Status</Table.Header>
              <Table.Header>Logs</Table.Header>
              <Table.Header></Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {list.map((item) => (
              <Table.Row>
                <Table.Cell>{item.metadata.info.id}</Table.Cell>
                <Table.Cell>
                  <InvocationStatus invocation={item.invocation} />
                </Table.Cell>
                <Table.Cell>
                  <InvocationLogs invocation={item.invocation} />
                </Table.Cell>
                <Table.Cell>
                  <Table.Toolbar>
                    <InvocationReplay
                      metadata={item.metadata.info}
                      invocation={item.invocation}
                    />
                  </Table.Toolbar>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Stack>
    </Root>
  );
}
