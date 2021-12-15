import { useStacks } from "~/data/aws/stacks";
import { styled } from "@stitches/react";
import { Row, Scroll, Stack } from "~/components";
import { Accordion } from "~/components";
import { useMemo } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { Detail } from "./Detail";

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

type FunctionRef = {
  name: string;
  via?: string;
  fn: {
    stack: string;
    node: string;
  };
};

export function Functions() {
  const stacks = useStacks();
  const functions = useMemo(
    () =>
      stacks
        .map((s) => ({
          info: s.info,
          functions: s.metadata.constructs.flatMap((c): FunctionRef[] => {
            switch (c.type) {
              case "Queue":
                if (!c.data.consumer) return [];
                return [
                  {
                    name: c.id,
                    via: "Queue Consumer",
                    fn: c.data.consumer,
                  },
                ];
              case "Api":
                return c.data.routes.map((r) => ({
                  name: r.route!,
                  fn: r.fn!,
                  via: `API: ${c.id}`,
                }));
              case "Function":
                return [
                  {
                    name: c.id,
                    fn: {
                      node: c.addr,
                      stack: s.info.StackName,
                    },
                  },
                ];
              default:
                return [];
            }
          }),
        }))
        .filter((s) => s.functions.length > 0),
    stacks
  );

  return (
    <Row style={{ height: "100%" }}>
      <FunctionList>
        <Scroll.Area>
          <Scroll.ViewPort>
            <Accordion.Root
              type="multiple"
              defaultValue={stacks.map((i) => i.info.StackName)}
            >
              {functions.map((stack) => (
                <Accordion.Item
                  key={stack.info.StackName}
                  value={stack.info.StackName}
                >
                  <Accordion.Header>
                    <Accordion.Trigger>
                      <div>{stack.info.StackName}</div>
                      <Accordion.Icon />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content>
                    {stack.functions.map((f) => (
                      <Function key={f.name} to={`${f.fn.stack}/${f.fn.node}`}>
                        <Stack space="sm">
                          <FunctionName>{f.name}</FunctionName>
                          {f.via && <FunctionVia>{f.via}</FunctionVia>}
                        </Stack>
                      </Function>
                    ))}
                  </Accordion.Content>
                </Accordion.Item>
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
