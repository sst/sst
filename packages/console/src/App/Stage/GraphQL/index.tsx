import { useMemo } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { groupBy, pipe } from "remeda";
import { useConstruct, useStacks } from "~/data/aws/stacks";
import { useDarkMode } from "~/data/global";
import { styled } from "~/stitches.config";
import {
  ApiMetadata,
  AppSyncApiMetadata,
} from "../../../../../resources/src/Metadata";
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
  const [constructs, grouped] = useMemo(() => {
    const apis =
      stacks.data?.constructs.byType.Api?.filter((item) => {
        return (
          (item.data.graphql as any) === "true" ||
          item.data.routes.some(
            (x) => x.type === "pothos" || x.type === "graphql"
          )
        );
      }) || [];
    const appsync = stacks.data?.constructs.byType.AppSync || [];
    const constructs = [...apis, ...appsync];
    const grouped = groupBy(constructs, (x) => x.stack);
    return [constructs, grouped];
  }, [stacks.data]);
  const selected = useConstruct("AppSync", params.stack!, params.addr!) as
    | ApiMetadata
    | AppSyncApiMetadata;
  const dm = useDarkMode();

  const url = useMemo(() => {
    if (!selected) return;
    const base = selected.data.customDomainUrl || selected.data.url;
    if (selected.type === "Api") {
      const route = selected.data.routes.find(
        (x) => x.type === "pothos" || x.type === "graphql"
      );
      if (!route) return base;
      return base.replace(/[\/]+$/g, "") + route.route.split(" ")[1];
    }
    return base;
  }, [selected]);

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
                {Object.entries(grouped).map(([stack, constructs]) => (
                  <HeaderSwitcherGroup>
                    <HeaderSwitcherLabel>{stack}</HeaderSwitcherLabel>
                    {constructs.map((item) => (
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
                  endpoint: url,
                  settings: {
                    "editor.fontFamily": "'Jetbrains Mono', monospace",
                    "editor.theme": dm.enabled ? "dark" : "light",
                    "schema.polling.endpointFilter": "*",
                  },
                  headers: {
                    "x-api-key":
                      selected.type === "AppSync"
                        ? selected.data.appSyncApiKey
                        : "",
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
