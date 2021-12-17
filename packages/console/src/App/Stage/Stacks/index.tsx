import { Badge, Row, Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1 } from "../components";

const StackItem = styled("div", {
  padding: "$xl 0",
  borderBottom: "1px solid $border",
  flexShrink: 0,
  "&:first-child": {
    paddingTop: 0,
  },
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
      <Stack space="xl">
        <H1>Stacks</H1>
        <Stack space="0">
          {stacks.data!.all.map((s) => (
            <StackItem key={s.info.StackName}>
              <Stack space="lg">
                <Row alignHorizontal="justify" alignVertical="start">
                  <Stack space="sm">
                    <StackName>{s.info.StackName}</StackName>
                    <Row>
                      <StackMetric>
                        {s.constructs.byType.Function?.length} Functions
                      </StackMetric>
                    </Row>
                  </Stack>
                  <Badge size="md" color="success">
                    {s.info.StackStatus}
                  </Badge>
                </Row>
                {Boolean(s.info.Outputs?.length) && (
                  <Table.Root>
                    <Table.Head>
                      <Table.Row>
                        <Table.Header>Output</Table.Header>
                        <Table.Header>Value</Table.Header>
                      </Table.Row>
                    </Table.Head>
                    <Table.Body>
                      {s.info.Outputs?.map((o) => (
                        <Table.Row key={o.OutputKey}>
                          <Table.Cell>{o.OutputKey}</Table.Cell>
                          <Table.Cell>{o.OutputValue}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
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
