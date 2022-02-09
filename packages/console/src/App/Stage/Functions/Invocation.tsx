import { memo, useEffect, useRef, useState } from "react";
import { CgRedo } from "react-icons/cg";
import { Link } from "react-router-dom";
import {
  Anchor,
  Badge,
  Button,
  JsonView,
  Row,
  Spacer,
  Stack,
} from "~/components";
import { useFunctionInvoke } from "~/data/aws";
import { styled } from "~/stitches.config";
import type { Invocation } from "../../../../../core/src/local/router";
import type { FunctionMetadata } from "../../../../../resources/src/Metadata";

type Props = {
  invocation: Invocation;
  metadata: FunctionMetadata;
  showSource?: boolean;
};

const InvocationRoot = styled("div", {
  width: "100%",
  overflow: "auto",
  position: "relative",
  fontSize: "$sm",
});

const InvocationMask = styled("div", {
  position: "absolute",
  height: 40,
  width: "100%",
  background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, $mask 100%)",
  bottom: 0,
});

export const InvocationRow = memo((props: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  const observer = useRef(
    new ResizeObserver((entries) => {
      const { height } = entries[0].contentRect;
      setHeight(height + 80);
    })
  );

  useEffect(() => {
    if (ref.current) {
      observer.current.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.current!.unobserve(ref.current);
    };
  }, [ref.current]);

  return (
    <InvocationRoot
      style={{
        height: height,
        transition:
          Date.now() - (props.invocation.times.end || Date.now()) > 1000
            ? "initial"
            : "300ms all",
      }}
    >
      <Row alignHorizontal="justify" alignVertical="center">
        <Row alignVertical="center">
          <Status invocation={props.invocation} />
          <Spacer horizontal="md" />
          <Source {...props} />
        </Row>
        <Replay invocation={props.invocation} metadata={props.metadata} />
      </Row>
      <Spacer vertical="sm" />
      <Row
        ref={ref}
        style={{
          width: "100%",
        }}
        alignVertical="start"
      >
        <Logs metadata={props.metadata} invocation={props.invocation} />
      </Row>
      <InvocationMask />
    </InvocationRoot>
  );
});

const SourceRoot = styled("div", {
  wordWrap: "break-word",
  width: 150,
  fontSize: "$sm",
  flexShrink: 0,
  lineHeight: 1.5,
  flexGrow: 1,
});

function Source(props: Props) {
  const content = (() => {
    const http = props.invocation.request.requestContext?.http;
    if (http) return http.method + " " + http.path;
    return props.metadata.id;
  })();
  return (
    <SourceRoot>
      <Anchor
        as={Link}
        to={`../functions/${props.metadata.stack}/${props.metadata.addr}`}
      >
        {content}
      </Anchor>
    </SourceRoot>
  );
}

const StatusRoot = styled("div", {
  width: 120,
  flexShrink: 0,
  "& > *": {
    width: "100%",
  },
});

type StatusProps = {
  invocation: Invocation;
};

export function Status(props: StatusProps) {
  const { invocation } = props;
  if (!invocation.response)
    return (
      <StatusRoot>
        <Badge size="sm" color="neutral">
          Pending
        </Badge>
      </StatusRoot>
    );

  return (
    <StatusRoot>
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
      </Stack>
    </StatusRoot>
  );
}

const LogRow = styled("div", {
  fontSize: "$sm",
  lineHeight: 1.5,
  borderBottom: "1px solid $border",
  padding: "$sm 0",
  display: "flex",
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
  whiteSpace: "pre-wrap",
  overflow: "auto",
  textOverflow: "ellipsis",
  overflowWrap: "break-word",
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

type LogsProps = {
  invocation: Invocation;
  metadata: FunctionMetadata;
};

const LogsRoot = styled("div", {
  flexGrow: 1,
  overflow: "auto",
});

function Logs(props: LogsProps) {
  return (
    <LogsRoot>
      <LogRow>
        <LogTimestamp>
          {new Date(props.invocation.times.start)
            .toISOString()
            .split("T")[1]
            .substring(0, 12)}
        </LogTimestamp>
        {typeof props.invocation.request === "string" ? (
          "Request: " + props.invocation.request
        ) : (
          <Row alignHorizontal="justify">
            <JsonView.Root>
              <JsonView.Content name="Request" src={props.invocation.request} />
            </JsonView.Root>
          </Row>
        )}
      </LogRow>
      {props.invocation.logs.map((item) => (
        <LogRow key={item.timestamp}>
          <LogTimestamp>
            {new Date(item.timestamp)
              .toISOString()
              .split("T")[1]
              .substring(0, 12)}
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
            {new Date(props.invocation.times.end!)
              .toISOString()
              .split("T")[1]
              .substring(0, 12)}
          </LogTimestamp>
          <LogStackTrace>
            {props.invocation.response.error.stackTrace.length === 0 &&
              props.invocation.response.error.errorMessage}
            {props.invocation.response.error.stackTrace.map((item, index) => (
              <div style={{ fontSize: "0.75rem" }} key={index}>
                {item}
              </div>
            ))}
          </LogStackTrace>
        </LogRow>
      )}
      {props.invocation.response?.type === "success" && (
        <LogRow>
          <LogTimestamp>
            {new Date(props.invocation.times.end!)
              .toISOString()
              .split("T")[1]
              .substring(0, 12)}
          </LogTimestamp>
          {typeof props.invocation.response.data !== "object" ||
          props.invocation.response.data === null ? (
            "Response: " + props.invocation.response.data
          ) : (
            <JsonView.Root>
              <JsonView.Content
                name="Response"
                src={props.invocation.response.data}
              />
            </JsonView.Root>
          )}
        </LogRow>
      )}
    </LogsRoot>
  );
}

type ReplayProps = {
  metadata: FunctionMetadata;
  invocation: Invocation;
};

export function Replay(props: ReplayProps) {
  const invoke = useFunctionInvoke();
  return (
    <Button
      color="ghost"
      size="xs"
      onClick={() =>
        invoke.mutate({
          arn: props.metadata.data.arn,
          payload: props.invocation.request,
        })
      }
    >
      <CgRedo />
      Replay
    </Button>
  );
}
