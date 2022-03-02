import { useEffect, useMemo } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { BiTrash } from "react-icons/bi";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { filter, groupBy, pipe } from "remeda";
import { Button, Input, Row, Scroll, Stack } from "~/components";
import { useConstruct, useStacks } from "~/data/aws/stacks";
import { styled } from "~/stitches.config";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderSwitcherLabel,
  HeaderGroup,
  HeaderSwitcherGroup,
} from "../components";

export function Api() {
  return (
    <Routes>
      <Route path=":stack/:addr/*" element={<Explorer />} />
      <Route path="*" element={<Explorer />} />
    </Routes>
  );
}

const Root = styled("div", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  overflow: "hidden",
});

const Content = styled("div", {
  overflow: "hidden",
  flexGrow: 1,
  display: "flex",
});

const Request = styled("div", {
  flexGrow: 1,
});

const RequestTabs = styled("div", {
  display: "flex",
  background: "$accent",
});

const RequestTabsItem = styled(NavLink, {
  fontSize: "$sm",
  cursor: "pointer",
  padding: "$md $lg",
  fontWeight: 500,
  color: "$hiContrast",
  "&.active": {
    background: "$highlight",
    color: "white",
  },
});

const RequestToolbar = styled("div", {
  borderBottom: "1px solid $border",
  userSelect: "none",
  padding: "$lg",
  display: "flex",
  color: "$gray10",
  fontSize: "$sm",
  alignItems: "start",
  justifyContent: "end",
  minHeight: 36,
});

const RouteList = styled("div", {
  height: "100%",
  width: "300px",
  overflow: "hidden",
  flexShrink: 0,
  borderRight: "1px solid $border",
});

const RouteItem = styled("div", {
  padding: "$lg",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  fontSize: "$sm",
  borderBottom: "1px solid $border",
  userSelect: "none",
  fontWeight: 500,
  variants: {
    active: {
      true: {
        color: "$highlight",
      },
    },
  },
});

const Empty = styled("div", {
  padding: "$lg",
});

interface Request {
  route: string;
  query: {
    name: string;
    value: string;
  }[];
}

export function Explorer() {
  const stacks = useStacks();
  const params = useParams<{ stack: string; addr: string; "*": string }>();
  const [constructs, grouped] = useMemo(() => {
    const constructs = pipe(
      stacks.data?.constructs.byType.Api || [],
      filter((item) => (item.data.graphql as any) !== "true")
    );
    const grouped = pipe(
      constructs,
      groupBy((item) => item.stack)
    );
    return [constructs, grouped];
  }, [stacks.data]);
  const selected = useConstruct("Api", params.stack!, params.addr!);

  // const [urlParams, setUrlParams] = useSearchParams();

  const form = useForm<Request>({
    defaultValues: {
      route: selected?.data?.routes?.[0].route,
      query: [{ name: "", value: "" }],
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    console.log(data);
  });

  if (constructs.length > 0 && !selected)
    return (
      <Navigate
        replace
        to={`${constructs[0].stack}/${constructs[0].addr}/query`}
      />
    );

  return (
    <Root>
      <Header>
        <HeaderTitle>Api</HeaderTitle>
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
          <>
            <RouteList>
              <Scroll.Area>
                <Scroll.ViewPort>
                  {selected.data.routes.map((item) => (
                    <RouteItem
                      onClick={() => form.setValue("route", item.route)}
                      active={form.watch("route") === item.route}
                    >
                      {item.route}
                    </RouteItem>
                  ))}
                </Scroll.ViewPort>

                <Scroll.Bar orientation="vertical">
                  <Scroll.Thumb />
                </Scroll.Bar>
              </Scroll.Area>
            </RouteList>
            <Request>
              <FormProvider {...form}>
                <form onSubmit={onSubmit}>
                  <RequestTabs>
                    <RequestTabsItem replace to="query">
                      Query
                    </RequestTabsItem>
                    <RequestTabsItem replace to="body">
                      Body
                    </RequestTabsItem>
                    <RequestTabsItem replace to="headers">
                      Headers
                    </RequestTabsItem>
                  </RequestTabs>
                  <Routes>
                    <Route path="query" element={<Query />} />
                  </Routes>
                  <RequestToolbar>
                    <Button>Send</Button>
                  </RequestToolbar>
                </form>
              </FormProvider>
            </Request>
          </>
        )}
        {constructs.length === 0 && <Empty>No APIs in this app</Empty>}
      </Content>
    </Root>
  );
}

const QueryRoot = styled("div", {
  padding: "$lg",
  paddingBottom: 0,
});
const QueryParamRemove = styled(BiTrash, {
  cursor: "pointer",
  flexShrink: 0,
});

function Query() {
  const form = useFormContext();
  const query = useFieldArray({
    name: "query",
    control: form.control,
  });

  return (
    <QueryRoot>
      <Stack space="sm">
        <Row>
          <Button type="button" color="accent" onClick={() => query.append({})}>
            Add Parameter
          </Button>
        </Row>
        {query.fields.map((_item, index) => (
          <Row alignVertical="center">
            <Input
              name={`query[${index}].name`}
              placeholder={`Parameter ${index + 1}`}
              {...form.register(`query[${index}].name`)}
            />
            <Input
              name={`query[${index}].value`}
              placeholder={`Value ${index + 1}`}
              {...form.register(`query[${index}].value`)}
            />
            <QueryParamRemove onClick={() => query.remove(index)} />
          </Row>
        ))}
      </Stack>
    </QueryRoot>
  );
}
