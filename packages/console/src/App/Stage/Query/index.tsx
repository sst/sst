import React, { useEffect, useRef, useState } from "react";
import { Button, Row, Spinner, Table } from "~/components";
import { styled } from "~/stitches.config";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-clouds";
import "ace-builds/src-noconflict/theme-clouds_midnight";
import "ace-builds/src-noconflict/ext-language_tools";
import { useSqlQuery, getDatabases } from "~/data/aws/query";
import ReactAce from "react-ace/lib/ace";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderGroup,
  HeaderSwitcherLabel,
} from "../components";
import { useParams, useNavigate, Route, Routes } from "react-router-dom";
import { useDarkMode } from "~/data/global";
import { useQueryClient } from "react-query";
import { useConstruct, useFunctionInvoke, useStacks } from "~/data/aws";
import {
  FunctionMetadata,
  RDSMetadata,
} from "../../../../../resources/src/Metadata";
import { Invocations } from "../Functions/Detail";

const Root = styled("div", {
  height: "100%",
});

const QueryArea = styled("div", {
  display: "flex",
  flexDirection: "column",
  // screen-height - header-height
  height: "calc(100vh - 70px)",
  width: "100%",
  overflowY: "scroll",
});

const Editor = styled(AceEditor, {
  resize: "vertical",
  borderBottom: "1px solid $border",
});

const Box = styled("div", {
  overflowY: "auto",
  // screen height - header height - editor height
  height: "calc(100vh - 70px - 240px)",
});

const Center = styled("div", {
  display: "grid",
  placeItems: "center",
  height: "100vh",
});

const HeaderStatus = styled("span", {
  marginLeft: "$md",
  display: "inline-block",
});

const StatusText = styled("span", {
  fontSize: "$sm",
  marginLeft: "$sm",
  color: "$gray11",
  variants: {
    color: {
      success: {
        color: "$green10",
      },
      danger: {
        color: "$red10",
      },
    },
  },
});

const Sidebar = styled("div", {
  padding: "$md",
  border: "1px solid $border",
  height: "calc(100vh - 70px)",
  width: "50%",
});

const SidebarContent = styled("div", {
  height: "90%",
  overflow: "auto",
});

const SidebarFooter = styled("div", {
  height: "10%",
  padding: "0 $md",
  display: "flex",
  alignItems: "center",
  borderRadius: 4,
  gap: "$md",
  justifyContent: "flex-end",
  border: "1px solid $border",
});

const Container = styled("div", {
  display: "flex",
  position: "relative",
});

const ContainerText = styled("p", {
  color: "$gray8",
  fontSize: "$xs",
});

const ContainerFooter = styled("div", {
  width: "calc(100% - 20px)",
  position: "absolute",
  left: 10,
  bottom: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  margin: "0 auto",
});

function Query() {
  const navigate = useNavigate();
  const stacks = useStacks();
  const params = useParams();
  const rds = stacks.data?.constructs.byType.RDS || [];
  const functions = stacks.data?.constructs.byType.Function || [];

  useEffect(() => {
    if (rds.length === 0) return;
    if (params["*"]) return;
    navigate(`${rds[0].id}`);
  }, [params]);

  return (
    <Root>
      <Routes>
        <Route
          path=":cluster/*"
          element={<Explorer rds={rds} functions={functions} />}
        />
        <Route
          path="*"
          element={<Explorer rds={rds} functions={functions} />}
        />
      </Routes>
    </Root>
  );
}

function Explorer(props: {
  rds: RDSMetadata[];
  functions: FunctionMetadata[];
}) {
  const [sql, setSql] = useState("");
  const [open, setOpen] = useState(false);
  const params = useParams();
  const ref = useRef<ReactAce>(null);
  const dm = useDarkMode();
  const queryClient = useQueryClient();
  const invoke = useFunctionInvoke();
  const rds = props.rds;
  const functions = props.functions;
  const navigate = useNavigate();
  const currentCluster = rds.find((r) => r.id === params.cluster);

  const databases = getDatabases(
    currentCluster?.data.secretArn || "",
    currentCluster?.data.clusterArn || ""
  );

  const query = useSqlQuery(
    sql,
    currentCluster?.data.clusterArn || "",
    currentCluster?.data.secretArn || "",
    params["*"]!,
    databases.refetch
  );

  const functionMetadata = useConstruct(
    "Function",
    currentCluster?.data.migrator?.stack || "",
    currentCluster?.data.migrator?.node || ""
  );

  useEffect(() => {
    ref.current?.editor?.focus();
    setSql("");
    setOpen(false);
    if (databases.status === "success") {
      if (params["*"] && databases.data.includes(params["*"])) return;
      navigate(`${databases.data[0]}`);
    }
  }, [databases.status, params.cluster, params["*"]]);

  const runQuery = async () => {
    const text = ref.current?.editor?.getValue();
    await queryClient.cancelQueries(["sqlquery", text]);
    setSql("");
    setSql(text!);
  };

  if (databases.isLoading) {
    return (
      <Center>
        <Spinner />
      </Center>
    );
  }

  return (
    <Root>
      <Header>
        <HeaderTitle>
          Query
          <HeaderStatus>
            {!query.isFetching && query.data && sql.length > 0 && (
              <StatusText color={query.data?.success ? "success" : "danger"}>
                {query.data?.success ? "success" : "error"}
                {query.data.updated! > 0 && ` (${query.data.updated} updated)`}
              </StatusText>
            )}
          </HeaderStatus>
        </HeaderTitle>

        <HeaderGroup>
          <Button
            color="ghost"
            onClick={() => {
              setOpen((p) => !p);
            }}
          >
            Migrations
          </Button>
          <HeaderSwitcher value={params.cluster!}>
            <HeaderSwitcherLabel>Cluster</HeaderSwitcherLabel>
            {databases.data &&
              rds.map((item: any, idx: number) => (
                <HeaderSwitcherItem
                  key={idx}
                  to={`../${item.id}/${databases.data[0]!}`}
                >
                  {item.id}
                </HeaderSwitcherItem>
              ))}
          </HeaderSwitcher>
          <p>/</p>
          <HeaderSwitcher value={params["*"]!}>
            <HeaderSwitcherLabel>Database</HeaderSwitcherLabel>
            {databases.data?.map((item: any, idx: number) => (
              <HeaderSwitcherItem key={idx} to={`../${params.cluster}/${item}`}>
                {item}
              </HeaderSwitcherItem>
            ))}
          </HeaderSwitcher>
        </HeaderGroup>
      </Header>

      <Row>
        <QueryArea>
          <Container>
            <Editor
              mode="sql"
              theme={dm.enabled ? "clouds_midnight" : "clouds"}
              ref={ref}
              height="240px"
              width="100%"
              commands={[
                {
                  name: "run",
                  bindKey: {
                    win: "Ctrl-enter",
                    mac: "Ctrl-enter",
                  },
                  exec: runQuery,
                },
              ]}
              name="editor"
              editorProps={{ $blockScrolling: true }}
              setOptions={{
                tabSize: 3,
                enableLiveAutocompletion: true,
                showPrintMargin: false,
                fontSize: 14,
                fontFamily: "JetBrains Mono",
                showGutter: false,
              }}
            />
            <ContainerFooter>
              <ContainerText color="danger">
                Hit Ctrl+Enter to run query
              </ContainerText>
              <Button
                color={query.isFetching ? "accent" : "highlight"}
                onClick={runQuery}
              >
                {!query.isFetching ? "Run" : <Spinner size="sm" />}
              </Button>
            </ContainerFooter>
          </Container>

          <Box>
            {!query.isFetching && query.status === "success" && (
              <Table.Root flush>
                <Table.Head>
                  <Table.Row>
                    {query.data &&
                      query.data.columns &&
                      query.data?.columns.map((column: any, idx: number) => (
                        <Table.Header key={idx}>{column}</Table.Header>
                      ))}
                  </Table.Row>
                </Table.Head>

                <Table.Body>
                  {query.data &&
                    query.data.rows &&
                    query.data?.rows.map((u, i) => (
                      <Table.Row key={i}>
                        {u.map((v, idx) => (
                          <Table.Cell key={idx}>{v}</Table.Cell>
                        ))}
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        </QueryArea>
        <Sidebar hidden={!open}>
          <SidebarContent>
            <Invocations function={functionMetadata} />
          </SidebarContent>
          <SidebarFooter>
            <Button color="accent" onClick={() => setOpen(false)}>
              close
            </Button>
            <Button
              onClick={async () => {
                await invoke.mutateAsync({
                  arn:
                    functions.find(
                      (f) => f.addr === currentCluster?.data.migrator?.node
                    )?.data.arn || "",
                  payload: "",
                });
              }}
              color={invoke.isLoading ? "accent" : "highlight"}
              disabled={invoke.isLoading}
            >
              {!invoke.isLoading ? "Migrate" : <Spinner size="sm" />}
            </Button>
          </SidebarFooter>
        </Sidebar>
      </Row>
    </Root>
  );
}

export default Query;
