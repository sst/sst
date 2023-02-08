import { useEffect, useMemo } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { BiTrash } from "react-icons/bi";
import { useMutation } from "react-query";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { concat, filter, groupBy, map, pipe } from "remeda";
import {
  Badge,
  Button,
  Input,
  JsonView,
  Row,
  Scroll,
  Select,
  Spinner,
  Stack,
} from "~/components";
import { useConstruct, useStacks } from "~/data/aws/stacks";
import { useRealtimeState } from "~/data/global";
import { styled } from "~/stitches.config";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderSwitcherLabel,
  HeaderGroup,
  HeaderSwitcherGroup,
  H3,
} from "../components";
import { Invocations } from "../Functions/Detail";

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
  display: "flex",
  flexDirection: "column",
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
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$md",
  "& select": {
    width: "auto",
    marginRight: "$sm",
  },
  [`& ${Row}`]: {
    width: "auto",
  },
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

const Scroller = styled("div", {
  flexGrow: 1,
  overflowY: "auto",
});

interface Request {
  route: string;
  method?: string;
  body?: string;
  query: {
    name: string;
    value: string;
  }[];
  path: {
    name: string;
    value: string;
  }[];
  headers: {
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
      concat(stacks.data?.constructs.byType.ApiGatewayV1Api || []),
      filter(
        (item) =>
          !("graphql" in item.data) || (item.data.graphql as any) !== "true"
      )
    );
    const grouped = pipe(
      constructs,
      groupBy((item) => item.stack)
    );
    return [constructs, grouped];
  }, [stacks.data]);
  const selectedApi = useConstruct("Api", params.stack!, params.addr!);
  const selectedApiV1 = useConstruct(
    "ApiGatewayV1Api",
    params.stack!,
    params.addr!
  );
  const selected = selectedApi;

  useEffect(() => {
    if (!selected) return;
    form.setValue("route", selected?.data?.routes?.[0]?.route);
  }, [selected]);

  const form = useForm<Request>({
    defaultValues: {
      path: [],
      query: [{ name: "", value: "" }],
      headers: [{ name: "", value: "" }],
    },
  });

  const route = selected?.data.routes.find(
    (x) => x.route === form.watch("route")
  );
  const [method, path] = useMemo(() => {
    if (route?.route === "$default") return ["ANY", "{path}"];
    return route?.route.split(" ") || [];
  }, [route]);

  const invokeApi = useMutation({
    mutationKey: ["invokeApi", selected?.addr, route?.route],
    mutationFn: async (data: Request) => {
      const pathParams = [...data.path];
      const processedPath = path
        .split("/")
        .map((item) => {
          if (item.startsWith("{") && item.endsWith("}")) {
            const result = pathParams.shift().value;
            if (!result) throw new Error("Missing path param: " + item);
            return result;
          }
          return item;
        })
        .join("/");

      const searchParams = new URLSearchParams();
      for (const item of data.query) {
        if (item.name && item.value) searchParams.append(item.name, item.value);
      }
      const proxy = false ? `https://local.serverless-stack.com:12557/proxy/` : "";
      const query = searchParams.toString();
      const result = await fetch(
        `${proxy}${selected.data.url}${processedPath}${
          query ? "?" + query : ""
        }`,
        {
          method: method === "ANY" ? data.method : method,
          headers: pipe(
            data.headers,
            filter((x) => Boolean(x.name && x.value)),
            map((x) => [x.name, x.value]),
            Object.fromEntries
          ),
          body: data.body ? data.body : undefined,
        }
      );
      const body = await result.text();
      return {
        status: result.status,
        headers: Object.fromEntries(result.headers.entries()),
        body,
      };
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    invokeApi.mutate(data);
  });

  const functionMetadata = useConstruct(
    "Function",
    route?.fn?.stack,
    route?.fn?.node
  );
  const isLocal = useRealtimeState(
    (s) => s.functions[functionMetadata?.data.localId] != undefined,
    [route]
  );

  const nav = useNavigate();

  useEffect(() => {
    if (!path) return;
    invokeApi.reset();
    const result = pipe(
      path,
      (x) => x.split("/"),
      filter((x) => x.startsWith("{") && x.endsWith("}")),
      map((x) => x.replaceAll("{", "").replaceAll("}", "")),
      map((x) => ({
        name: x,
        value: "",
      }))
    );
    form.setValue("path", result);
    if (path.length > 0) nav("url");
  }, [selected, path]);

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
        <HeaderTitle>API</HeaderTitle>
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
                  {selected.data.routes.length === 0 && (
                    <Empty>No routes</Empty>
                  )}
                </Scroll.ViewPort>

                <Scroll.Bar orientation="vertical">
                  <Scroll.Thumb />
                </Scroll.Bar>
              </Scroll.Area>
            </RouteList>
            {form.watch("route") && (
              <Request>
                <FormProvider {...form}>
                  <form onSubmit={onSubmit} onKeyDown={(e) => {
                    if (e.metaKey && e.key === "Enter") {
                      onSubmit()
                    }
                  }}>
                    <RequestTabs>
                      {form.watch("path").length > 0 && (
                        <RequestTabsItem replace to="url">
                          URL
                        </RequestTabsItem>
                      )}
                      <RequestTabsItem replace to="query">
                        Query
                      </RequestTabsItem>
                      <RequestTabsItem replace to="headers">
                        Headers
                      </RequestTabsItem>
                      <RequestTabsItem replace to="body">
                        Body
                      </RequestTabsItem>
                    </RequestTabs>
                    <Routes>
                      {form.watch("path").length > 0 && (
                        <Route path="url" element={<Url />} />
                      )}
                      <Route path="query" element={<Query />} />
                      <Route path="body" element={<Body />} />
                      <Route path="headers" element={<Headers />} />
                      <Route path="*" element={<Navigate to="query" />} />
                    </Routes>
                    <RequestToolbar>
                      {invokeApi.error ? (
                        <Badge message color="danger">
                          {(invokeApi.error as any).message}
                        </Badge>
                      ) : (
                        <div>{route?.route}</div>
                      )}
                      <Row>
                        {method === "ANY" && (
                          <Select {...form.register("method")}>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                            <option value="HEAD">HEAD</option>
                          </Select>
                        )}
                        <Button>
                          {!invokeApi.isLoading ? (
                            "Send"
                          ) : (
                            <Spinner size="sm" color="accent" />
                          )}
                        </Button>
                      </Row>
                    </RequestToolbar>
                  </form>
                </FormProvider>
                <Scroller>
                  {isLocal && functionMetadata && (
                    <Invocations function={functionMetadata} />
                  )}
                  {!isLocal && (
                    <ParamRoot>
                      <Stack space="lg">
                        <H3>Response</H3>
                        {invokeApi.data && (
                          <JsonView.Root>
                            <JsonView.Content
                              name={invokeApi.data?.status.toString()}
                              collapsed={3}
                              src={invokeApi.data}
                            />
                          </JsonView.Root>
                        )}
                      </Stack>
                    </ParamRoot>
                  )}
                </Scroller>
              </Request>
            )}
          </>
        )}
        {constructs.length === 0 && <Empty>No APIs in this app</Empty>}
      </Content>
    </Root>
  );
}

const BodyTextArea = styled("textarea", {
  padding: "$md $lg",
  border: "0",
  fontSize: "$sm",
  background: "transparent",
  color: "$hiContrast",
  lineHeight: 1.5,
  borderRadius: 4,
  width: "100%",
  resize: "none",
  fontFamily: "$sans",
  "&:focus": {
    outline: "none",
  },
});

function Body() {
  const form = useFormContext<Request>();
  return <BodyTextArea {...form.register("body")} placeholder="Body" />;
}

const ParamRoot = styled("div", {
  padding: "$lg",
  paddingBottom: 0,
});
const ParamRemove = styled(BiTrash, {
  cursor: "pointer",
  flexShrink: 0,
});

function Headers() {
  const form = useFormContext();
  const list = useFieldArray({
    name: "headers",
    control: form.control,
  });

  return (
    <ParamRoot>
      <Row>
        <Button type="button" color="accent" onClick={() => list.append({})}>
          Add Header
        </Button>
        <Stack space="sm">
          {list.fields.map((_item, index) => (
            <Row alignVertical="center" key={index}>
              <Input
                placeholder={`Header ${index + 1}`}
                {...form.register(`headers[${index}].name`)}
              />
              <Input
                placeholder={`Value ${index + 1}`}
                {...form.register(`headers[${index}].value`)}
              />
              {list.fields.length > 1 && (
                <ParamRemove onClick={() => list.remove(index)} />
              )}
            </Row>
          ))}
        </Stack>
      </Row>
    </ParamRoot>
  );
}

function Url() {
  const form = useFormContext<Request>();

  return (
    <ParamRoot>
      <Row>
        <Stack space="sm">
          {form.watch("path").map((item, index) => (
            <Row alignVertical="center" key={index}>
              <Input disabled value={item.name} />
              <Input
                placeholder={`Value`}
                {...form.register(`path.${index}.value`)}
              />
            </Row>
          ))}
        </Stack>
      </Row>
    </ParamRoot>
  );
}

function Query() {
  const form = useFormContext();
  const query = useFieldArray({
    name: "query",
    control: form.control,
  });

  return (
    <ParamRoot>
      <Row>
        <Button type="button" color="accent" onClick={() => query.append({})}>
          Add Parameter
        </Button>
        <Stack space="sm">
          {query.fields.map((_item, index) => (
            <Row alignVertical="center" key={index}>
              <Input
                placeholder={`Parameter ${index + 1}`}
                {...form.register(`query[${index}].name`)}
              />
              <Input
                placeholder={`Value ${index + 1}`}
                {...form.register(`query[${index}].value`)}
              />
              {query.fields.length > 1 && (
                <ParamRemove onClick={() => query.remove(index)} />
              )}
            </Row>
          ))}
        </Stack>
      </Row>
    </ParamRoot>
  );
}
