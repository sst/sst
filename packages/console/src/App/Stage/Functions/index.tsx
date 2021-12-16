import { StackInfo, useConstruct, useStacks } from "~/data/aws/stacks";
import { styled } from "@stitches/react";
import { Row, Scroll, Stack } from "~/components";
import { Accordion } from "~/components";
import { useMemo } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Detail } from "./Detail";
import { map, pipe } from "remeda";
import { useRealtimeState } from "~/data/global";
import { BsBox, BsEyeFill } from "react-icons/bs";

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

export function Functions() {
  const stacks = useStacks();

  return (
    <Row style={{ height: "100%" }}>
      <FunctionList>
        <Scroll.Area>
          <Scroll.ViewPort>
            <Accordion.Root
              type="multiple"
              defaultValue={stacks.data!.all.map((i) => i.info.StackName)}
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
      <Routes>
        <Route path=":stack/:function" element={<Detail />} />
      </Routes>
    </Row>
  );
}

function StackItem(props: { stack: StackInfo }) {
  const { stack } = props;
  const children = stack.constructs.all.flatMap((c) => {
    switch (c.type) {
      case "Api":
        return c.data.routes
          .filter((r) => r.fn)
          .map((r) => (
            <Function
              key={c.addr + r.route}
              to={`${r.fn!.stack}/${r.fn!.node}`}
            >
              <Stack space="sm">
                <FunctionName>{r.route}</FunctionName>
                <FunctionVia>{c.id}</FunctionVia>
              </Stack>
              <FunctionIcons stack={r.fn!.stack} addr={r.fn!.node} />
            </Function>
          ));
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
      case "Function":
        return (
          <Function key={c.addr} to={`${stack.info.StackName}/${c.addr}`}>
            <FunctionName>{c.id}</FunctionName>
            <FunctionIcons stack={stack.info.StackName} addr={c.addr} />
          </Function>
        );
      default:
        return [];
    }
  });
  if (!children.length) return null;
  return (
    <Accordion.Item value={stack.info.StackName}>
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
  const [state] = useRealtimeState();
  const construct = useConstruct("Function", props.stack, props.addr);
  const current = state.functions[construct.data.localId];
  if (!current) return <span />;
  return (
    <Row>
      {current.warm && <BsEyeFill />}
      {current.state !== "idle" && current.warm && <BsBox />}
    </Row>
  );
}
