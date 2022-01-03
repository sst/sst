import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { Accordion, Scroll } from "~/components";
import { Stack } from "~/components/Stack";
import { styled } from "~/stitches.config";
import { useStacks } from "~/data/aws";
import { Detail } from "./Detail";

const Root = styled("div", {
  display: "flex",
  height: "100%",
});

const BucketList = styled("div", {
  height: "100%",
  width: "300px",
  overflow: "hidden",
  flexShrink: 0,
  borderRight: "1px solid $border",
});

const Bucket = styled(NavLink, {
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

const BucketName = styled("div", {
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const Content = styled("div", {
  height: "100%",
  overflow: "hidden",
  flexGrow: 1,
});

export function Buckets() {
  const stacks = useStacks();
  const buckets = stacks?.data?.constructs.byType["Bucket"] || [];

  return (
    <Root>
      <BucketList>
        <Scroll.Area>
          <Scroll.ViewPort>
            <Accordion.Root
              type="multiple"
              defaultValue={stacks.data!.all.map((i) => i.info.StackName!)}
            >
              {stacks.data?.all
                .filter(
                  (stack) =>
                    (stack.constructs.byType["Bucket"] || []).length > 0
                )
                .map((stack) => (
                  <Accordion.Item
                    key={stack.info.StackName}
                    value={stack.info.StackName!}
                  >
                    <Accordion.Header>
                      <Accordion.Trigger>
                        {stack.info.StackName}
                        <Accordion.Icon />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content>
                      {stack.constructs.byType["Bucket"]?.map((c) => (
                        <Bucket key={c.id} to={`${c.data.name}`}>
                          <Stack space="sm">
                            <BucketName>{c.id}</BucketName>
                          </Stack>
                        </Bucket>
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
      </BucketList>

      <Content>
        <Routes>
          <Route path=":bucket/*" element={<Detail />} />
          {buckets.length > 0 && (
            <Route
              path="*"
              element={<Navigate to={`${buckets[0].data.name}`} />}
            />
          )}
        </Routes>
      </Content>
    </Root>
  );
}
