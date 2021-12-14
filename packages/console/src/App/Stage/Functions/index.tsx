import { useStacks } from "~/data/aws/stacks";
import { styled } from "@stitches/react";
import { Row } from "~/components";
import { Accordion } from "~/components";
import { useMemo } from "react";
import { Header } from "../components";
import { NavLink, Route, Routes } from "react-router-dom";
import { Detail } from "./Detail";

const FunctionList = styled("div", {
  padding: "$sm",
  width: "280px",
  height: "100%",
  borderRight: "1px solid $border",
});

const Function = styled("div", {
  fontSize: "$sm",
  padding: "0 $md",
  background: "$loContrast",
  display: "flex",
  alignItems: "center",
});

const FunctionLine = styled("div", {
  background: "$border",
  width: "3px",
  height: "30px",
});

const FunctionArrow = styled("div", {
  background: "$border",
  height: "3px",
  width: "20px",
  marginRight: "6px",
});

const FunctionName = styled(NavLink, {
  color: "$hiContrast",
  "&.active": {
    fontWeight: 700,
    color: "$highlight",
  },
});

const ListHeader = styled(Header, {
  padding: "$lg",
  borderBottom: "1px solid $border",
});

export function Functions() {
  const stacks = useStacks();
  const functions = useMemo(
    () =>
      stacks
        .map((s) => ({
          info: s.info,
          functions: s.metadata.constructs.filter((c) => c.type === "Function"),
        }))
        .filter((s) => s.functions.length > 0),
    stacks
  );

  return (
    <Row style={{ height: "100%" }}>
      <FunctionList>
        <Accordion.Root
          type="multiple"
          defaultValue={stacks.map((i) => i.info.StackName)}
        >
          {functions.map((stack) => (
            <Accordion.Item value={stack.info.StackName}>
              <Accordion.Header>
                <Accordion.Trigger>
                  <div>{stack.info.StackName}</div>
                  <Accordion.Icon />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content>
                {stack.functions.map((f) => (
                  <Function>
                    <FunctionLine />
                    <FunctionArrow />
                    <FunctionName to={`${stack.info.StackName}/${f.name}`}>
                      {f.name}
                    </FunctionName>
                  </Function>
                ))}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </FunctionList>
      <Routes>
        <Route path=":stack/:function" element={<Detail />} />
      </Routes>
    </Row>
  );
}
