import { Badge, Row, Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { Header } from "../components";

const StackRow = styled("div", {
  display: "grid",
  gap: "$lg",
});

const StackItem = styled("div", {
  padding: "$xl 0",
  borderBottom: "1px solid $border",
  flexShrink: 0,
});

const StackName = styled("div", {
  fontWeight: 600,
});

const StackMetric = styled("div", {
  fontSize: "$sm",
  color: "$gray11",
});

const Root = styled("div", {
  padding: "$xl",
});

export function Stacks() {
  const stacks = useStacks();
  return (
    <Root>
      <Stack space="lg">
        <Header>Stacks</Header>
        <Stack space="0">
          {stacks.map((s) => (
            <StackItem>
              <Stack space="lg">
                <Row alignHorizontal="justify" alignVertical="start">
                  <Stack space="sm">
                    <StackName>{s.info.StackName}</StackName>
                    <Row>
                      <StackMetric>
                        {
                          s.metadata.constructs.filter(
                            (x) => x.type === "Function"
                          ).length
                        }{" "}
                        Functions
                      </StackMetric>
                    </Row>
                  </Stack>
                  <Badge size="md" color="success">
                    {s.info.StackStatus}
                  </Badge>
                </Row>
                {Boolean(s.info.Outputs?.length) && (
                  <Table.Root>
                    <Table.Row>
                      <Table.Header>Output</Table.Header>
                      <Table.Header>Value</Table.Header>
                    </Table.Row>
                    {s.info.Outputs?.map((o) => (
                      <Table.Row>
                        <Table.Cell>{o.OutputKey}</Table.Cell>
                        <Table.Cell>{o.OutputValue}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Root>
                )}
              </Stack>
            </StackItem>
          ))}
        </Stack>
      </Stack>
    </Root>
  );
}
