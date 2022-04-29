import { Row, Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { Header, HeaderTitle } from "../components";

const Content = styled("div", {
  padding: "$lg",
});

const StackItem = styled("div", {
  padding: "$xl 0",
  borderBottom: "1px solid $border",
  flexShrink: 0,
  "&:first-child": {
    paddingTop: 0,
  },
  "&:last-child": {
    border: 0,
  },
});

const StackName = styled("div", {
  fontWeight: 600,
});

const StackMetric = styled("div", {
  fontSize: "$sm",
  color: "$gray11",
});

const Constructs = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  gap: "$md",
});

const ConstructsItem = styled("div", {
  color: "$hiContrast",
  padding: "$md",
  fontSize: "$sm",
  border: "1px solid $border",
  borderRadius: 6,
  width: 200,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const ConstructsItemName = styled("div", {
  fontWeight: 500,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
});
const ConstructsItemType = styled("div", {
  fontSize: "$xs",
});

export function Stacks() {
  const stacks = useStacks();

  return (
    <>
      <Header>
        <HeaderTitle>Stacks</HeaderTitle>
      </Header>
      <Content>
        {stacks.data!.all.map((s) => (
          <StackItem key={s.info.StackName}>
            <Stack space="lg">
              <Row alignHorizontal="justify" alignVertical="start">
                <Stack space="sm">
                  <StackName>{s.info.StackName}</StackName>
                  {!s.info.Outputs?.length && !s.constructs.all.length && (
                    <StackMetric>No exports in this stack</StackMetric>
                  )}
                </Stack>
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
              {s.constructs.all.length > 0 && (
                <Constructs>
                  {s.constructs.all
                    .filter((c) => c.type !== "Function")
                    .map((c) => {
                      /*
                        const _link = (() => {
                          switch (c.type) {
                            case "Auth":
                              return `../cognito/${c.data.userPoolId}`;
                            case "Function":
                              return `../functions/${c.stack}/${c.addr}`;
                            case "Api":
                              const route = c.data.routes.find((r) => r.fn);
                              if (!route) return ``;
                              return `../functions/${route.fn?.stack}/${route.fn?.node}`;
                            case "Topic":
                              const [subscriber] = c.data.subscribers;
                              if (!subscriber) return ``;
                              return `../functions/${subscriber.stack}/${subscriber.node}`;
                            case "Queue":
                              if (!c.data.consumer) return ``;
                              return `../functions/${c.data.consumer.stack}/${c.data.consumer.node}`;
                            default:
                              return "";
                          }
                        })();
                        */
                      return (
                        <ConstructsItem>
                          <Stack space="xs">
                            <ConstructsItemName title={c.id}>
                              {c.id}
                            </ConstructsItemName>
                            <ConstructsItemType>{c.type}</ConstructsItemType>
                          </Stack>
                        </ConstructsItem>
                      );
                    })}
                </Constructs>
              )}
            </Stack>
          </StackItem>
        ))}
      </Content>
    </>
  );
}
