import { memo, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import {
  Button,
  Row,
  Spinner,
  Stack,
  Table,
  Textarea,
  Toast,
} from "~/components";
import { useFunctionInvoke, useLogsQuery } from "~/data/aws/function";
import { useConstruct } from "~/data/aws/stacks";
import { keyframes, styled } from "~/stitches.config";
import { H1, H3 } from "../components";
import { FunctionMetadata } from "../../../../../resources/src/Metadata";
import { useRealtimeState } from "~/data/global";
import { InvocationRow } from "./Invocation";
import { CloudWatchInvocation } from "./CWInvocation";
import { Issues } from "./Issues";

const Root = styled("div", {
  padding: "$xl",
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
          <Button
            type="submit"
            color={invoke.isLoading ? "accent" : "highlight"}
            disabled={invoke.isLoading}
          >
            {!invoke.isLoading ? "Send" : <Spinner size="sm" />}
          </Button>
        </Row>
      </Stack>
    </form>
  );
});

function Invocations(props: { function: FunctionMetadata }) {
  const invocations = useRealtimeState(
    (s) => s.functions[props.function.data.localId]?.invocations || [],
    [props.function.data.localId]
  );

  return (
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
  );
}

function Logs(props: { function: FunctionMetadata }) {
  // Start fetching log in the last 1 minute
  const invocations = useLogsQuery({
    arn: props.function.data.arn,
  });

  return (
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
