import { Badge } from "~/components";
import { useFunctionInvoke } from "~/data/aws";
import { styled, keyframes } from "~/stitches.config";
import type { Invocation } from "../../../../../core/src/local/router";
import type { FunctionMetadata } from "../../../../../resources/src/Metadata";

type InvocationResultProps = {
  invocation: Invocation;
};

export function InvocationStatus(props: InvocationResultProps) {
  const { invocation } = props;
  if (!invocation.response)
    return (
      <Badge size="sm" color="neutral">
        Pending
      </Badge>
    );

  if (invocation.response.type === "failure")
    return (
      <Badge size="sm" color="danger">
        Error
      </Badge>
    );

  if (invocation.response.type === "timeout")
    return (
      <Badge size="sm" color="danger">
        Timeout
      </Badge>
    );

  if (invocation.response.type === "success")
    return (
      <Badge size="sm" color="success">
        Success
      </Badge>
    );
  return (
    <Badge size="sm" color="neutral">
      Unknown
    </Badge>
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

const LogLabel = styled("div", {
  color: "$hiContrast",
  fontWeight: 600,
  variants: {
    color: {
      success: {
        color: "$green10",
      },
      highlight: {
        color: "$highlight",
      },
      danger: {
        color: "$red10",
      },
    },
  },
});

const LogMessage = styled("div", {
  flexGrow: 1,
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
  fontSize: "$sm",
  display: "none",
});

type InvocationLogsProps = {
  invocation: Invocation;
};

export function InvocationLogs(props: InvocationLogsProps) {
  return (
    <>
      <LogRow>
        <LogLabel>REQUEST:</LogLabel>
        <LogMessage>{JSON.stringify(props.invocation.request)}</LogMessage>
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
          <LogLabel>Error</LogLabel>
          <LogMessage>
            <LogStackTrace>
              {props.invocation.response.error.stackTrace.map((item) => (
                <div>{item}</div>
              ))}
            </LogStackTrace>
          </LogMessage>
        </LogRow>
      )}
      {props.invocation.response?.type === "success" && (
        <LogRow>
          <LogLabel>Response</LogLabel>
          <LogMessage>
            {JSON.stringify(props.invocation.response.data)}
          </LogMessage>
        </LogRow>
      )}
    </>
  );
}

type InvocationReplayProps = {
  metadata: FunctionMetadata;
  invocation: Invocation;
};

const ReplayButton = styled("div", {
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "underline",
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
