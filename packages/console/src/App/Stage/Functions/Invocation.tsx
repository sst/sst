import { Badge, JsonView, Row, Spacer, Stack } from "~/components";
import { useFunctionInvoke } from "~/data/aws";
import { styled, keyframes } from "~/stitches.config";
import type { Invocation } from "../../../../../core/src/local/router";
import type { FunctionMetadata } from "../../../../../resources/src/Metadata";

type InvocationProps = {
  invocation: Invocation;
  metadata: FunctionMetadata;
};

export function InvocationRow(props: InvocationProps) {
  return (
    <Row>
      <InvocationStatus
        metadata={props.metadata}
        invocation={props.invocation}
      />
      <Spacer horizontal="lg" />
      <InvocationLogs invocation={props.invocation} />
    </Row>
  );
}

const InvocationStatusRoot = styled("div", {
  width: 100,
  flexShrink: 0,
});

export function InvocationStatus(props: InvocationProps) {
  const { invocation } = props;
  if (!invocation.response)
    return (
      <InvocationStatusRoot>
        <Badge size="sm" color="neutral">
          Pending
        </Badge>
      </InvocationStatusRoot>
    );

  return (
    <InvocationStatusRoot>
      <Stack space="sm" alignHorizontal="stretch">
        {invocation.response.type === "failure" && (
          <Badge size="sm" color="danger">
            Error
          </Badge>
        )}
        {invocation.response.type === "timeout" && (
          <Badge size="sm" color="danger">
            Timeout
          </Badge>
        )}
        {invocation.response.type === "success" && (
          <Badge size="sm" color="success">
            Success
          </Badge>
        )}
        <InvocationReplay metadata={props.metadata} invocation={invocation} />
      </Stack>
    </InvocationStatusRoot>
  );
}

const LogAnimation = keyframes({
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
});

const LogRow = styled("div", {
  fontSize: "$sm",
  lineHeight: 1.5,
  borderBottom: "1px solid $border",
  padding: "$sm 0",
  display: "flex",
  animation: `${LogAnimation} 300ms`,
  "&:first-child": {
    paddingTop: 0,
  },
  "&:last-child": {
    border: 0,
    paddingBottom: 0,
  },
  gap: "$md",

  "& > *:first-child": {
    flexBasis: "120px",
    flexShrink: 0,
  },
});

const LogTimestamp = styled("div", {});

const LogMessage = styled("div", {
  flexGrow: 1,
  whiteSpace: "pre",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const LogStackTrace = styled("div", {
  padding: "$md $lg",
  borderRadius: 6,
  background: "$orange3",
  color: "$orange12",
  lineHeight: 2,
});

const LogDuration = styled("div", {
  flexShrink: 0,
  display: "none",
});

type InvocationLogsProps = {
  invocation: Invocation;
};

const InvocationLogsRoot = styled("div", {
  flexGrow: 1,
  overflow: "hidden",
});

export function InvocationLogs(props: InvocationLogsProps) {
  return (
    <InvocationLogsRoot>
      <LogRow>
        <LogTimestamp>
          {new Date(props.invocation.times.start).toISOString().split("T")[1]}
        </LogTimestamp>
        <JsonView.Root>
          <JsonView.Content name="Request" src={props.invocation.request} />
        </JsonView.Root>
      </LogRow>
      {props.invocation.logs.map((item) => (
        <LogRow>
          <LogTimestamp>
            {new Date(item.timestamp).toISOString().split("T")[1]}
          </LogTimestamp>
          <LogMessage>{item.message}</LogMessage>
          <LogDuration>
            {item.timestamp - props.invocation.times.start}ms
          </LogDuration>
        </LogRow>
      ))}
      {props.invocation.response?.type === "failure" && (
        <LogRow>
          <LogTimestamp>
            {new Date(props.invocation.times.end!).toISOString().split("T")[1]}
          </LogTimestamp>
          <LogStackTrace>
            {props.invocation.response.error.stackTrace.map((item) => (
              <div>{item}</div>
            ))}
          </LogStackTrace>
        </LogRow>
      )}
      {props.invocation.response?.type === "success" && (
        <LogRow>
          <LogTimestamp>
            {new Date(props.invocation.times.end!).toISOString().split("T")[1]}
          </LogTimestamp>
          <JsonView.Root>
            <JsonView.Content name="Response" src={props.invocation.response} />
          </JsonView.Root>
        </LogRow>
      )}
    </InvocationLogsRoot>
  );
}

type InvocationReplayProps = {
  metadata: FunctionMetadata;
  invocation: Invocation;
};

const ReplayButton = styled(Badge, {
  cursor: "pointer",
  defaultVariants: {
    size: "sm",
  },
});

export function InvocationReplay(props: InvocationReplayProps) {
  const invoke = useFunctionInvoke();
  return (
    <ReplayButton
      onClick={() =>
        invoke.mutate({
          arn: props.metadata.data.arn,
          payload: props.invocation.request,
        })
      }
    >
      Replay
    </ReplayButton>
  );
}
