import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Row, Spacer, Stack, Table, useOnScreen } from "~/components";
import { useFunctionQuery, useLogsQuery } from "~/data/aws/function";
import { useConstruct, useStackFromName } from "~/data/aws/stacks";
import { styled, keyframes } from "~/stitches.config";
import { H1, H3 } from "../components";
import { FunctionMetadata } from "../../../../../resources/dist/Metadata";
import { useRealtimeState } from "~/data/global";
import {
  InvocationLogs,
  InvocationReplay,
  InvocationStatus,
} from "./Invocation";

const Root = styled("div", {
  padding: "$xl",
  overflowX: "hidden",
  flexGrow: 1,
});

export function Detail() {
  const params = useParams();
  const stack = useStackFromName(params.stack!);
  const functionMetadata = useConstruct(
    "Function",
    params.stack!,
    params.function!
  );

  const func = useFunctionQuery(functionMetadata.data.arn);
  const [state] = useRealtimeState();
  const functionState = state.functions[functionMetadata.data.localId];

  if (func.isLoading) return <span />;
  if (!stack) return <span>Stack not found</span>;

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
        {functionState?.warm && (
          <Stack space="lg">
            <H3>Invocations</H3>
            <Invocations function={functionMetadata} />
          </Stack>
        )}
        {!functionState?.warm && (
          <Stack space="md">
            <H3>Logs</H3>
            <Logs functionName={func.data?.FunctionName!} />
          </Stack>
        )}
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

const HistoryLogAnimation = keyframes({
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
});

function Invocations(props: { function: FunctionMetadata }) {
  const [state] = useRealtimeState();
  const invocations =
    state.functions[props.function.data.localId]?.invocations || [];
  if (!invocations) return <></>;

  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header style={{ width: 120 }}>Status</Table.Header>
          <Table.Header>Logs</Table.Header>
          <Table.Header></Table.Header>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {invocations.map((item) => (
          <Table.Row>
            <Table.Cell>
              <InvocationStatus invocation={item} />
            </Table.Cell>
            <Table.Cell>
              <InvocationLogs invocation={item} />
            </Table.Cell>
            <Table.Cell>
              <Table.Toolbar>
                <InvocationReplay metadata={props.function} invocation={item} />
              </Table.Toolbar>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

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
            <LogTime>{new Date(entry?.timestamp!).toISOString()}</LogTime>
            <Spacer horizontal="lg" />
            <LogMessage>{entry?.message}</LogMessage>
          </LogRow>
        ))}
      {
        <LogLoader ref={ref}>
          {logs.isError
            ? "No Logs"
            : logs.isLoading
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
