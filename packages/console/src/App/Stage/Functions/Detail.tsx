import { memo, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import {
  Button,
  EmptyState,
  Row,
  Spacer,
  Stack,
  Table,
  Textarea,
  Toast,
  useOnScreen,
} from "~/components";
import { useFunctionInvoke, useLogsQuery } from "~/data/aws/function";
import { useConstruct } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import { FunctionMetadata } from "../../../../../resources/src/Metadata";
import { useRealtimeState } from "~/data/global";
import { InvocationRow } from "./Invocation";
import { Issues } from "./Issues";

const Root = styled("div", {
  padding: "$xl",
  overflowX: "hidden",
  flexGrow: 1,
});

const Description = styled("div", {
  fontSize: "$sm",
  color: "$gray11",
});

export function Detail() {
  const params = useParams();
  const functionMetadata = useConstruct(
    "Function",
    params.stack!,
    params.function!
  );

  return (
    <>
      <Root>
        <Stack space="xl">
          <Row alignHorizontal="justify">
            <H1>{functionMetadata.id}</H1>
          </Row>
          <IssuesContainer metadata={functionMetadata} />
          {/*
        <Stack space="md">
          <H3>Environment</H3>
          <EnvironmentTable
            variables={func.data?.Environment?.Variables || {}}
          />
        </Stack>
          */}
          <Stack space="md">
            <H3>Invoke</H3>
            <Invoke metadata={functionMetadata} />
          </Stack>
          <Invocations function={functionMetadata} />
        </Stack>
      </Root>
    </>
  );
}

const IssuesContainer = memo((props: { metadata: FunctionMetadata }) => {
  const issues = useRealtimeState(
    (s) => s.functions[props.metadata.data.localId]?.issues.build || [],
    [props.metadata.data.localId]
  );
  if (!issues.length) return null;
  return <Issues compact issues={issues} />;
});

const Invoke = memo((props: { metadata: FunctionMetadata }) => {
  const invoke = useFunctionInvoke();
  const form = useForm<{ json: string }>();
  const toast = Toast.use();
  const onSubmit = form.handleSubmit((data) => {
    try {
      const parsed = !data.json ? {} : JSON.parse(data.json);
      invoke.mutate({
        arn: props.metadata.data.arn,
        payload: parsed,
      });
      form.reset();
    } catch {
      toast.create({
        type: "danger",
        text: "Invalid JSON payload",
      });
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack space="md">
        <Textarea
          onKeyPress={(e) => {
            if (e.key === "Enter" && e.ctrlKey) onSubmit();
          }}
          {...form.register("json")}
          placeholder="{}"
        />
        <Row alignHorizontal="end">
          <Button type="submit">Send</Button>
        </Row>
      </Stack>
    </form>
  );
});

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

function Invocations(props: { function: FunctionMetadata }) {
  const invocations = useRealtimeState(
    (s) => s.functions[props.function.data.localId]?.invocations || [],
    [props.function.data.localId]
  );

  return (
    <Stack space="lg" alignHorizontal="start">
      <Stack space="sm">
        <H3>Invocations</H3>
        {!Boolean(invocations.length) && (
          <Description>Waiting for invocations...</Description>
        )}
      </Stack>
      <Stack space="0" style={{ width: "100%" }}>
        {invocations.map((invocation) => (
          <InvocationRow
            key={invocation.id}
            metadata={props.function}
            invocation={invocation}
          />
        ))}
      </Stack>
    </Stack>
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
