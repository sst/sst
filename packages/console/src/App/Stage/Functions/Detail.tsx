import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Row, Spacer, Stack, Table, useOnScreen } from "~/components";
import { useFunctionQuery, useLogsQuery } from "~/data/aws/function";
import { useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import { FunctionMetadata } from "../../../../../resources/dist/Metadata";

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
      stack?.metadata.constructs.find(
        (c): c is FunctionMetadata =>
          c.type === "Function" && c.addr === params.function
      )!,
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
        {/*
        <Stack space="md">
          <H3>Environment</H3>
          <EnvironmentTable
            variables={func.data?.Environment?.Variables || {}}
          />
        </Stack>
          */}
        <Stack space="md">
          <H3>Logs</H3>
          <Logs functionName={func.data?.FunctionName!} />
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
  lineHeight: 1.75,
});

const LogMessage = styled("div", {
  flexGrow: 1,
  overflowX: "hidden",
  lineHeight: 1.75,
  wordWrap: "break-word",
});

const LogLoader = styled("div", {
  width: "100%",
  background: "$border",
  textAlign: "center",
  padding: "$md 0",
  fontWeight: 600,
  borderRadius: "6px",
});

function Logs(props: { functionName: string }) {
  const logs = useLogsQuery({
    functionName: props.functionName,
  });

  const ref: any = useRef<HTMLDivElement>();
  const loaderVisible = useOnScreen(ref);
  useEffect(() => {
    if (loaderVisible && logs.hasNextPage) logs.fetchNextPage();
  }, [loaderVisible]);

  return (
    <div
      onScroll={console.log}
      style={{
        width: "100%",
      }}
    >
      {logs.data?.pages
        .flatMap((page) => page.events)
        .map((entry, index) => (
          <LogRow key={index}>
            <LogTime>{new Date(entry?.timestamp!).toISOString()}</LogTime>
            <Spacer horizontal="lg" />
            <LogMessage>{entry?.message}</LogMessage>
          </LogRow>
        ))}
      {
        <LogLoader ref={ref}>
          {logs.isLoading
            ? "Loading..."
            : logs.hasNextPage
            ? "Load More"
            : "End of stream"}
        </LogLoader>
      }
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
