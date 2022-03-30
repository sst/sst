import { memo, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { Button, Row, Spinner, Stack, Table, Toast } from "~/components";
import { useFunctionInvoke, useLogsQuery } from "~/data/aws/function";
import { useConstruct } from "~/data/aws/stacks";
import { keyframes, styled } from "~/stitches.config";
import { H3, Header, HeaderTitle } from "../components";
import { FunctionMetadata } from "../../../../../resources/src/Metadata";
import { useRealtimeState } from "~/data/global";
import { InvocationRow } from "./Invocation";
import { CloudWatchInvocation } from "./CWInvocation";
import { Issues } from "./Issues";
import TextareaAutosize from "react-textarea-autosize";

const Root = styled("div", {
  overflowX: "hidden",
  flexGrow: 1,
});

const animation = keyframes({
  "0%": {
    opacity: 0.3,
  },
  "25%": {
    opacity: 1,
  },
  "75%": {
    opacity: 1,
  },
  "100%": {
    opacity: 0.3,
  },
});
const Description = styled("div", {
  fontSize: "$sm",
  color: "$gray11",
  variants: {
    pulsating: {
      true: {
        animation: `2s linear infinite normal both running ${animation}`,
      },
    },
  },
});

export function Detail() {
  const params = useParams();
  const functionMetadata = useConstruct(
    "Function",
    params.stack!,
    params.function!
  );
  const isLocal = useRealtimeState(
    (s) => s.functions[functionMetadata.data.localId] != undefined,
    [params.function]
  );

  return (
    <Root key={params.function}>
      <Header>
        <HeaderTitle>{functionMetadata.id}</HeaderTitle>
      </Header>
      <Invoke metadata={functionMetadata} />
      <Stack space="xl">
        <IssuesContainer metadata={functionMetadata} />
        {/*
        <Stack space="md">
          <H3>Environment</H3>
          <EnvironmentTable
            variables={func.data?.Environment?.Variables || {}}
          />
        </Stack>
          */}
        {isLocal && <Invocations function={functionMetadata} />}
        {!isLocal && <Logs function={functionMetadata} />}
      </Stack>
    </Root>
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

const InvokeRoot = styled("div", {
  paddingBottom: "$md",
  borderBottom: "1px solid $border",
});

const InvokeToolbar = styled("div", {
  padding: "0 $lg",
  display: "flex",
  color: "$gray10",
  fontSize: "$sm",
  alignItems: "center",
  height: 36,
  justifyContent: "space-between",
});

const InvokeTextarea = styled(TextareaAutosize, {
  padding: "$md $lg",
  border: "0",
  fontSize: "$sm",
  background: "transparent",
  color: "$hiContrast",
  lineHeight: 1.5,
  borderRadius: 4,
  width: "100%",
  resize: "none",
  "&:focus": {
    outline: "none",
  },
});

const Invoke = memo((props: { metadata: FunctionMetadata }) => {
  const invoke = useFunctionInvoke();
  const form = useForm<{ json: string }>({
    mode: "onChange",
    defaultValues: {
      json: "",
    },
  });
  const toast = Toast.use();
  const onSubmit = form.handleSubmit((data) => {
    try {
      const parsed = !data.json ? {} : JSON.parse(data.json);
      invoke.mutate({
        arn: props.metadata.data.arn,
        payload: parsed,
      });
    } catch {
      toast.create({
        type: "danger",
        text: "Invalid JSON payload",
      });
    }
  });

  return (
    <InvokeRoot>
      <form onSubmit={onSubmit}>
        <InvokeTextarea
          maxRows={20}
          minRows={5}
          onKeyPress={(e) => {
            if (e.key === "Enter" && e.ctrlKey) onSubmit();
          }}
          {...form.register("json")}
          placeholder="{}"
        />
        <InvokeToolbar>
          <div>Ctrl + Enter to invoke</div>

          <Button
            type="submit"
            style={{ width: 100 }}
            color="highlight"
            disabled={invoke.isLoading}
          >
            {invoke.isLoading ? <Spinner size="sm" color="accent" /> : "Invoke"}
          </Button>
        </InvokeToolbar>
      </form>
    </InvokeRoot>
  );
});

const InvocationsRoot = styled("div", {
  padding: "$lg",
});

export function Invocations(props: { function: FunctionMetadata }) {
  const invocations = useRealtimeState(
    (s) => s.functions[props.function.data.localId]?.invocations || [],
    [props.function.data.localId]
  );

  return (
    <InvocationsRoot>
      <Stack space="lg">
        <Row alignHorizontal="justify" alignVertical="center">
          <H3>Logs</H3>
          <Description>Connected</Description>
        </Row>
        <Stack space="0">
          {invocations.map((invocation) => (
            <InvocationRow
              key={invocation.id}
              metadata={props.function}
              invocation={invocation}
            />
          ))}
        </Stack>
      </Stack>
    </InvocationsRoot>
  );
}

function Logs(props: { function: FunctionMetadata }) {
  // Start fetching log in the last 1 minute
  const invocations = useLogsQuery({
    arn: props.function.data.arn,
  });

  return (
    <InvocationsRoot>
      <Stack space="lg">
        <Row alignHorizontal="justify" alignVertical="center">
          <H3>Logs</H3>
          <Description pulsating>
            {invocations.query.isError
              ? "Failed to fetch logs"
              : "Polling for logs"}
          </Description>
        </Row>
        <Stack space="xl">
          {invocations.data?.slice(0, 50).map((invocation, index) => (
            <CloudWatchInvocation key={index} invocation={invocation} />
          ))}
        </Stack>
      </Stack>
    </InvocationsRoot>
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
