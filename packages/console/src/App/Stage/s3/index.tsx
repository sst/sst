import { useEffect } from "react";
import {
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Accordion, Row, Scroll, Table } from "~/components";
import { Stack } from "~/components/Stack";
import { useConstructsByType, useConstruct } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import { H1 } from "../components";
import { useStacks } from "~/data/aws";
import { Detail } from "./Detail";

const Root = styled("div", {
  padding: "$xl",
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

export default function S3() {
  const stacks = useStacks();
  const buckets = stacks?.data?.constructs.byType["Bucket"];

  return (
    <Row css={{ height: "100%", position: "relative" }}>
      <FunctionList css={{ position: "fixed", overflowY: "scroll" }}>
        <Scroll.Area>
          <Scroll.ViewPort>
            <Accordion.Root
              type="multiple"
              defaultValue={stacks.data!.all.map((i) => i.info.StackName)}
            >
              {stacks.data?.all.map((stack) => (
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
                    {buckets?.map((c) => (
                      <Function key={c.id} to={`${c.data.name}`}>
                        <Stack space="sm">
                          <FunctionName>{c.id}</FunctionName>
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

      <div
        style={{
          marginLeft: "300px",
          width: "100%",
        }}
      >
        <Routes>
          <Route path=":name" element={<Detail />} />
        </Routes>
      </div>
    </Row>
  );
}
