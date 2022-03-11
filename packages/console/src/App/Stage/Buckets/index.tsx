import { NavLink, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Accordion, Scroll, Stack } from "~/components";
import { styled } from "~/stitches.config";
import { useConstruct, useStacks } from "~/data/aws";
import { Detail } from "./Detail";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderSwitcherLabel,
  HeaderGroup,
  HeaderOutlet,
  HeaderSwitcherGroup,
} from "../components";

const Root = styled("div", {
  display: "flex",
  height: "100%",
  flexDirection: "column",
});

const Content = styled("div", {
  height: "100%",
  overflow: "hidden",
  flexGrow: 1,
});

const Empty = styled("div", {
  padding: "$lg",
});

export function Buckets() {
  return (
    <Root>
      <Routes>
        <Route path=":stack/:bucket/*" element={<List />} />
        <Route path="*" element={<List />} />
      </Routes>
    </Root>
  );
}

export function List() {
  const stacks = useStacks();
  const buckets = stacks?.data?.constructs.byType["Bucket"] || [];
  const params = useParams();
  const bucket = useConstruct("Bucket", params.stack!, params.bucket!);
  if (buckets.length > 0 && !bucket)
    return <Navigate replace to={`${buckets[0].stack}/${buckets[0].addr}`} />;
  return (
    <>
      <Header>
        <HeaderTitle>Buckets</HeaderTitle>
        {buckets.length > 0 && (
          <HeaderSwitcher value={`${bucket?.stack} / ${bucket?.id}`}>
            {stacks.data?.all
              .filter((s) => s.constructs.byType.Bucket?.length || 0 > 0)
              .map((stack) => (
                <HeaderSwitcherGroup>
                  <HeaderSwitcherLabel>
                    {stack.info.StackName}
                  </HeaderSwitcherLabel>
                  {stack.constructs.byType.Bucket!.map((item) => (
                    <HeaderSwitcherItem
                      to={`../${stack.info.StackName}/${item.addr}`}
                    >
                      {item.id}
                    </HeaderSwitcherItem>
                  ))}
                </HeaderSwitcherGroup>
              ))}
          </HeaderSwitcher>
        )}
      </Header>
      <Content>
        {bucket && <Detail />}
        {buckets.length === 0 && <Empty>No buckets in this app</Empty>}
      </Content>
    </>
  );
}
