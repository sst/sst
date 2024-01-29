import { StackInfo, useConstruct, useStacks } from "~/data/aws/stacks";
import { styled } from "@stitches/react";
import { Row, Scroll, Spinner, Stack } from "~/components";
import { Accordion } from "~/components";
import { Navigate, NavLink, Route, Routes, useParams } from "react-router-dom";
import { Detail } from "./Detail";
import { useRealtimeState } from "~/data/global";
import { BsEyeFill } from "react-icons/bs";
import { MdErrorOutline } from "react-icons/md";
import { theme } from "~/stitches.config";
import { useEffect, useRef } from "react";

const Root = styled("div", {
  display: "flex",
  height: "100%",
  width: "100%",
  overflow: "hidden",
});

const FunctionList = styled("div", {
  height: "100%",
  width: "300px",
  overflow: "hidden",
  flexShrink: 0,
  borderRight: "1px solid $border",
});

const Function = styled(NavLink, {
  fontSize: "$sm",
  padding: "$lg",
  borderBottom: "1px solid $border",
  background: "$loContrast",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "300px",
  overflow: "hidden",
  "& > *:first-child": {
    flexGrow: 1,
  },
  "& > *": {
    color: "$hiContrast",
  },
  "&.active > *": {
    color: "$highlight !important",
  },
});

const FunctionName = styled("div", {
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const FunctionVia = styled("div", {
  wordWrap: "break-word",
  fontSize: "$xs",
});

const Content = styled("div", {
  height: "100%",
  overflow: "hidden",
  overflowY: "auto",
  flexGrow: 1,
});

export function Functions() {
  const stacks = useStacks();
  const functions = stacks.data?.constructs.byType.Function || [];
  const root = useRef<HTMLDivElement>(null);
  const params = useParams();
  useEffect(() => {
    root.current?.querySelector(".active")?.scrollIntoView();
  }, [params]);

  return (
    <Root>
      <FunctionList ref={root}>
        <Scroll.Area>
          <Scroll.ViewPort>
            <Accordion.Root
              type="multiple"
              defaultValue={stacks.data!.all.map((i) => i.info.StackName!)}
            >
              {stacks.data?.all.map((stack) => (
                <StackItem key={stack.info.StackName} stack={stack} />
              ))}
            </Accordion.Root>
          </Scroll.ViewPort>

          <Scroll.Bar orientation="vertical">
            <Scroll.Thumb />
          </Scroll.Bar>
        </Scroll.Area>
      </FunctionList>
      <Content>
        <Routes>
          <Route path=":stack/:function" element={<Detail />} />
          {functions.length > 0 && (
            <Route
              path="*"
              element={
                <Navigate
                  replace
                  to={`${functions[0].stack}/${functions[0].addr}`}
                />
              }
            />
          )}
        </Routes>
      </Content>
    </Root>
  );
}

function StackItem(props: { stack: StackInfo }) {
  const { stack } = props;
  const { integrations } = useStacks().data!.constructs;
  const children = stack.constructs.all.flatMap((c) => {
    // TODO: This code is going to scale poorly
    switch (c.type) {
      case "Cognito":
        if (c.data.triggers.length === 0) return [];
        return c.data.triggers.map((t) => (
          <Function
            key={c.addr + t.fn!.node}
            to={`${t.fn!.stack}/${t.fn!.node}`}
          >
            <Stack space="sm">
              <FunctionName>{c.id}</FunctionName>
              <FunctionVia>{t.name}</FunctionVia>
            </Stack>
            <FunctionIcons stack={t.fn!.stack} addr={t.fn!.node} />
          </Function>
        ));
      case "Topic":
        return c.data.subscribers.filter(fn => fn).map((fn, index) => (
          <Function key={c.addr + fn.node} to={`${fn.stack}/${fn.node}`}>
            <Stack space="sm">
              <FunctionName>{c.id}</FunctionName>
              <FunctionVia>
                Subscriber {c.data.subscriberNames?.[index] || "#" + index}
              </FunctionVia>
            </Stack>
            <FunctionIcons stack={fn.stack} addr={fn.node} />
          </Function>
        ));
      case "Bucket":
        return c.data.notifications.filter(Boolean).map((n, index) => (
          <Function key={c.addr + n!.node} to={`${n!.stack}/${n!.node}`}>
            <Stack space="sm">
              <FunctionName>{c.id}</FunctionName>
              <FunctionVia>
                Bucket Notifications{" "}
                {c.data.notificationNames?.[index] || "#" + index}
              </FunctionVia>
            </Stack>
            <FunctionIcons stack={n!.stack} addr={n!.node} />
          </Function>
        ));
      case "EventBus":
        return c.data.rules.flatMap((r) =>
          r.targets.filter(Boolean).map((t, index) => (
            <Function key={c.addr + t!.node} to={`${t!.stack}/${t!.node}`}>
              <Stack space="sm">
                <FunctionName>{r.key}</FunctionName>
                <FunctionVia>Event Target #{index}</FunctionVia>
                <FunctionVia>
                  Event Target {r.targetNames?.[index] || "#" + index}
                </FunctionVia>
              </Stack>
              <FunctionIcons stack={t!.stack} addr={t!.node} />
            </Function>
          ))
        );
      case "AppSync":
        return c.data.dataSources
          .filter((r) => r.fn)
          .map((r) => (
            <Function key={c.addr + r.name} to={`${r.fn!.stack}/${r.fn!.node}`}>
              <Stack space="sm">
                <FunctionName>{r.name}</FunctionName>
                <FunctionVia>{c.id}</FunctionVia>
              </Stack>
              <FunctionIcons stack={r.fn!.stack} addr={r.fn!.node} />
            </Function>
          ));
      case "Api":
      case "ApiGatewayV1Api":
      case "WebSocketApi":
        return c.data.routes
          .filter((r) => r.fn)
          .map((r) => (
            <Function
              key={c.addr + r.route}
              to={`${stack.info.StackName}/${r.fn!.node}`}
            >
              <Stack space="sm">
                <FunctionName>{r.route}</FunctionName>
                <FunctionVia>{c.id}</FunctionVia>
              </Stack>
              <FunctionIcons stack={r.fn!.stack} addr={r.fn!.node} />
            </Function>
          ));
      case "Cron":
        if (!c.data.job) return [];
        return (
          <Function
            key={c.addr}
            to={`${stack.info.StackName}/${c.data.job.node}`}
          >
            <Stack space="sm">
              <FunctionName>{c.id}</FunctionName>
              <FunctionVia>Cron Job</FunctionVia>
            </Stack>
            <FunctionIcons stack={c.data.job.stack} addr={c.data.job.node} />
          </Function>
        );
      case "Queue":
        if (!c.data.consumer) return [];
        return (
          <Function
            key={c.addr}
            to={`${stack.info.StackName}/${c.data.consumer.node}`}
          >
            <Stack space="sm">
              <FunctionName>{c.id}</FunctionName>
              <FunctionVia>Queue Consumer</FunctionVia>
            </Stack>
            <FunctionIcons
              stack={c.data.consumer.stack}
              addr={c.data.consumer.node}
            />
          </Function>
        );
      case "Table":
      case "KinesisStream":
        if (c.data.consumers.length === 0) return [];
        return c.data.consumers.map((t) => (
          <Function
            key={c.addr + t.fn!.node}
            to={`${t.fn!.stack}/${t.fn!.node}`}
          >
            <Stack space="sm">
              <FunctionName>{c.id}</FunctionName>
              <FunctionVia>{t.name}</FunctionVia>
            </Stack>
            <FunctionIcons stack={t.fn!.stack} addr={t.fn!.node} />
          </Function>
        ));
      case "Function":
        if (integrations[c.addr]?.length) return [];
        return (
          <Function key={c.addr} to={`${stack.info.StackName}/${c.addr}`}>
            <FunctionName>{c.id}</FunctionName>
            <FunctionIcons stack={stack.info.StackName!} addr={c.addr} />
          </Function>
        );
      default:
        return [];
    }
  });
  if (!children.length) return null;
  return (
    <Accordion.Item value={stack.info.StackName!}>
      <Accordion.Header>
        <Accordion.Trigger>
          <div>{stack.info.StackName}</div>
          <Accordion.Icon />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>{children}</Accordion.Content>
    </Accordion.Item>
  );
}

function FunctionIcons(props: { stack: string; addr: string }) {
  const construct = useConstruct("Function", props.stack, props.addr);
  if (!construct) return <span />;
  const current = useRealtimeState((s) => s.functions[construct.data.localId]);
  if (!current) return <span />;
  return (
    <div>
      <Row>
        {current.issues.build?.length > 0 && current.state === "idle" && (
          <MdErrorOutline
            style={{
              width: 20,
              height: 20,
              color: theme.colors.red9 as any,
            }}
          />
        )}
        {current.warm && false && <BsEyeFill />}
        {current.state === "building" && current.warm && <Spinner size="sm" />}
      </Row>
    </div>
  );
}
