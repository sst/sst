import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useConstruct, useStacks } from "~/data/aws/stacks";
import { useAuth, useDarkMode } from "~/data/global";
import { styled } from "~/stitches.config";
import { GraphQLApiMetadata } from "../../../../../resources/src/Metadata";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderSwitcherLabel,
  HeaderGroup,
  HeaderSwitcherGroup,
} from "../components";

export function GraphQL() {
  return (
    <Routes>
      <Route path=":stack/:addr/*" element={<Explorer />} />
      <Route path="*" element={<Explorer />} />
    </Routes>
  );
}

const Root = styled("div", {
  display: "flex",
  height: "100%",
  width: "100%",
  overflow: "hidden",
});

const Main = styled("div", {
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  height: "100%",
  overflow: "hidden",
});

const Content = styled("div", {
  overflow: "hidden",
  flexGrow: 1,
  "& iframe": {
    width: "100%",
    height: "100%",
  },
});

const Empty = styled("div", {
  padding: "$lg",
});

export function Explorer() {
  const stacks = useStacks();
  const params = useParams<{ stack: string; addr: string; "*": string }>();
  const apis = (stacks.data?.constructs.byType["Api"] || []).filter(
    (item): item is GraphQLApiMetadata => item.data.graphql
  );
  const appsync = stacks.data?.constructs.byType["AppSync"] || [];
  const constructs = [...apis, ...appsync];
  const selected = useConstruct("Api", params.stack!, params.addr!);
  const dm = useDarkMode();

  if (constructs.length > 0 && !selected)
    return <Navigate to={`${constructs[0].stack}/${constructs[0].addr}`} />;

  return (
    <Root>
      <Main>
        <Header>
          <HeaderTitle>GraphQL</HeaderTitle>
          {constructs.length > 0 && (
            <HeaderGroup>
              <HeaderSwitcher value={`${selected.stack} / ${selected.id}`}>
                {stacks.data?.all
                  .filter(
                    (s) =>
                      (s.constructs.byType["AppSync"]?.length || 0) +
                        (s.constructs.byType.Api?.filter((x) => x.data.graphql)
                          .length || 0) >
                      0
                  )
                  .map((stack) => (
                    <HeaderSwitcherGroup>
                      <HeaderSwitcherLabel>
                        {stack.info.StackName}
                      </HeaderSwitcherLabel>
                      {stack.constructs.byType.Api?.map((item) => (
                        <HeaderSwitcherItem
                          key={item.stack + item.addr}
                          to={`../${item.stack}/${item.addr}`}
                        >
                          {item.id}
                        </HeaderSwitcherItem>
                      ))}
                      {stack.constructs.byType.AppSync?.map((item) => (
                        <HeaderSwitcherItem
                          key={item.stack + item.addr}
                          to={`../${item.stack}/${item.addr}`}
                        >
                          {item.id}
                        </HeaderSwitcherItem>
                      ))}
                    </HeaderSwitcherGroup>
                  ))}
              </HeaderSwitcher>
            </HeaderGroup>
          )}
        </Header>
        <Content>
          {selected && (
            <iframe
              src={`/graphql.html?config=${btoa(
                JSON.stringify({
                  endpoint: selected.data.url,
                  settings: {
                    "editor.fontFamily": "'Jetbrains Mono'",
                    "editor.theme": dm.enabled ? "dark" : "light",
                    "schema.polling.endpointFilter": "*",
                  },
                })
              )}`}
            />
          )}
          {constructs.length === 0 && (
            <Empty>No GraphQL APIs in this app</Empty>
          )}
        </Content>
      </Main>
    </Root>
  );
}
