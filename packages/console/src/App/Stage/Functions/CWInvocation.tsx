import { Anchor, Badge, JsonView, Row, Spacer, Stack } from "~/components";
import { styled } from "~/stitches.config";
import type { Invocation } from "~/data/aws/function";
import { useAuth } from "~/data/global";

const Root = styled("div", {
  fontSize: "$sm",
});

const Request = styled("div", {
  flexGrow: 1,
  whiteSpace: "nowrap",
});

const Column = styled("div", {
  width: 102,
  flexShrink: 0,
  "& > *": {
    width: "100%",
  },
});

const LogRow = styled(Row, {
  borderBottom: "1px solid $border",
  padding: "$sm 0",
  "&:last-child": {
    borderBottom: "none",
  },
  lineHeight: 1.5,
});

const LogMessage = styled("div", {
  flexGrow: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const LogLevel = styled("div", {
  textTransform: "lowercase",
  width: 60,
  fontWeight: 600,
  variants: {
    level: {
      INFO: {
        color: "$hiContrast",
      },
      START: {
        color: "$hiContrast",
      },
      END: {
        color: "$hiContrast",
      },
      REPORT: {
        color: "$hiContrast",
      },
      ERROR: {
        color: "$red10",
      },
      WARN: {
        color: "$orange8",
      },
    },
  },
});

type CloudWatchInvocationProps = {
  invocation: Invocation;
};

export function CloudWatchInvocation(props: CloudWatchInvocationProps) {
  const auth = useAuth();
  return (
    <Root>
      <Row alignVertical="center">
        <Column>
          {props.invocation.endTime &&
            props.invocation.status === "SUCCESS" && (
              <Badge color="success">Success</Badge>
            )}
          {props.invocation.endTime && props.invocation.status === "ERROR" && (
            <Badge color="danger">Error</Badge>
          )}
          {props.invocation.endTime &&
            props.invocation.status === "UNKNOWN" && (
              <Badge color="neutral">Request</Badge>
            )}
          {!props.invocation.endTime && <Badge color="neutral">Pending</Badge>}
        </Column>
        <Spacer horizontal="md" />
        <Request>
          <Anchor
            target="_blank"
            href={`https://${auth.data?.region}.console.aws.amazon.com/cloudwatch/home?region=${auth.data?.region}#xray:traces/${props.invocation.xrayTraceId}`}
          >
            {props.invocation.requestId}
          </Anchor>
        </Request>
        {props.invocation.endTime && (
          <div>
            <Row alignVertical="center" alignHorizontal="end">
              {props.invocation.initDuration && (
                <>
                  <Spacer horizontal="sm" />
                  <Badge title="Cold start duration" size="xs" color="info">
                    {props.invocation.initDuration} ms
                  </Badge>
                </>
              )}
              <Spacer horizontal="sm" />
              <Badge title={props.invocation.memUsed + " MB used"} size="xs">
                {props.invocation.duration} ms
              </Badge>
            </Row>
          </div>
        )}
      </Row>
      <Spacer vertical="sm" />
      {props.invocation.logs
        .filter((item) => ["WARN", "INFO", "ERROR"].includes(item.level!))
        .map((item) => (
          <LogRow alignVertical="start">
            <Column>
              {new Date(props.invocation.startTime || 0)
                .toISOString()
                .split("T")[1]
                .substring(0, 12)}
            </Column>
            <Spacer horizontal="md" />
            <LogLevel level={item.level}>[{item.level}]</LogLevel>
            <Spacer horizontal="md" />
            <LogMessage>{item.message}</LogMessage>
          </LogRow>
        ))}
    </Root>
  );
}
