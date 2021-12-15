import { EnvironmentVariables } from "aws-sdk/clients/lambda";
import { useEffect, useMemo } from "react";
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { Badge, Row, Spacer, Stack, Table } from "~/components";
import { useFunctionQuery, useLogsQuery } from "~/data/aws/function";
import { useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import * as ScrollArea from "@radix-ui/react-scroll-area";

const Root = styled("div", {
  padding: "$lg",
  overflowX: "hidden",
  flexGrow: 1,
});

export function Detail() {
  const params = useParams();
  const stacks = useStacks();
  const [stack, functionMetadata] = useMemo(() => {
    const stack = stacks.find((s) => s.info.StackName === params.stack);
    return [
      stack!,
      stack?.metadata.constructs.find((c) => c.addr === params.function)!,
    ];
  }, [params.function, stacks]);

  const func = useFunctionQuery(functionMetadata.data.arn);

  if (func.isLoading) return <span />;

  return (
    <Root>
      <Stack space="xl">
        <Row alignHorizontal="justify">
          <H1>{functionMetadata.id}</H1>
          <Badge>{stack.info.StackName}</Badge>
        </Row>
        <Stack space="md">
          <H3>Logs</H3>
          <Logs functionName={func.data?.FunctionName!} />
        </Stack>
        <Stack space="md">
          <H3>Environment</H3>
          <EnvironmentTable
            variables={func.data?.Environment?.Variables || {}}
          />
        </Stack>
      </Stack>
    </Root>
  );
}

const LogRow = styled("div", {
  display: "flex",
  padding: "$md 0",
  fontSize: "$sm",
  borderTop: "1px solid $border",
  "&:first-child": {
    border: 0,
  },
});

const LogTime = styled("div", {
  flexShrink: 0,
});

const LogMessage = styled("div", {
  flexGrow: 1,
  lineHeight: 1.5,
  wordWrap: "break-word",
});

function Logs(props: { functionName: string }) {
  const logs = useLogsQuery({
    functionName: props.functionName,
  });

  return (
    <div
      style={{
        overflowY: "scroll",
        maxHeight: "500px",
        overflowX: "hidden",
        width: "100%",
      }}
    >
      {logs.data?.map((entry) => (
        <LogRow>
          <LogTime>{new Date(entry.timestamp!).toISOString()}</LogTime>
          <Spacer horizontal="lg" />
          <LogMessage>{entry.message}</LogMessage>
        </LogRow>
      ))}
    </div>
  );
}

function EnvironmentTable(props: { variables: Record<string, string> }) {
  const variables = useMemo(
    () =>
      Object.entries(props.variables).filter(
        ([key]) => !key.startsWith("SST_")
      ),
    [props.variables]
  );
  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header>Key</Table.Header>
          <Table.Header>Value</Table.Header>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {variables.map(([key, value]) => (
          <Table.Row key={key}>
            <Table.Cell>{key}</Table.Cell>
            <Table.Cell>{value}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
