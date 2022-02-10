import { useEffect, useRef, useState } from "react";
import { Badge, Button, Row, Spinner, Table } from "~/components";
import { styled } from "~/stitches.config";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-clouds";
import "ace-builds/src-noconflict/theme-clouds_midnight";
import "ace-builds/src-noconflict/ext-language_tools";
import { useRDSExecute, getDatabases } from "~/data/aws/rds";
import ReactAce from "react-ace/lib/ace";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderGroup,
  HeaderSwitcherLabel,
  HeaderSwitcherGroup,
} from "../components";
import {
  useParams,
  useNavigate,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useDarkMode } from "~/data/global";
import { useQueryClient } from "react-query";
import { useConstruct, useFunctionInvoke, useStacks } from "~/data/aws";
import {
  FunctionMetadata,
  RDSMetadata,
} from "../../../../../resources/src/Metadata";
import { Invocations } from "../Functions/Detail";
import { useHotkeys } from "@react-hook/hotkey";

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
  overflow: "auto",
  flexGrow: 1,
});

const Editor = styled(AceEditor, {
  resize: "none",
});

const Query = styled("div", {
  padding: "$lg",
  borderBottom: "1px solid $accent",
});

const QueryToolbar = styled("div", {
  display: "flex",
  color: "$gray10",
  fontSize: "$sm",
  alignItems: "center",
  height: 36,
  justifyContent: "space-between",
});

export function RDS() {
  return (
    <Root>
      <Routes>
        <Route path=":stack/:cluster/:database/*" element={<Explorer />} />
        <Route path=":stack/:cluster/*" element={<Explorer />} />
        <Route path="*" element={<Explorer />} />
      </Routes>
    </Root>
  );
}

function Explorer() {
  const stacks = useStacks();
  const rdsClusters = stacks.data?.constructs.byType.RDS || [];
  const params = useParams();
  const cluster = useConstruct("RDS", params.stack!, params.cluster!);

  const ref = useRef<ReactAce>(null);
  const dm = useDarkMode();
  const queryClient = useQueryClient();

  const databases = getDatabases(rdsClusters);

  const executeSql = useRDSExecute();

  useEffect(() => {
    ref.current?.editor?.focus();
  }, []);

  const runQuery = async () => {
    const sql = ref.current?.editor?.getValue() || "";
    console.log(params.database);
    await queryClient.cancelMutations();
    await executeSql.mutateAsync({
      sql,
      secretArn: cluster.data.secretArn,
      resourceArn: cluster.data.clusterArn,
      database: params.database!,
    });
    if (sql.includes("database")) await databases.refetch();
  };

  useHotkeys(window, [[["mod", "enter"], () => runQuery()]]);

  if (rdsClusters.length > 0 && !cluster)
    return (
      <Navigate
        replace
        to={`${rdsClusters[0].stack}/${rdsClusters[0].addr}/${rdsClusters[0].data.defaultDatabaseName}`}
      />
    );

  return (
    <Root>
      <Main>
        <Header>
          <HeaderTitle>RDS</HeaderTitle>

          <HeaderGroup>
            <HeaderSwitcher
              value={`${params.stack} / ${cluster.id}:${params.database}`}
            >
              {stacks.data?.all
                .filter((s) => s.constructs.byType.RDS?.length || 0 > 0)
                .map((stack) => (
                  <HeaderSwitcherGroup>
                    <HeaderSwitcherLabel>
                      {stack.info.StackName}
                    </HeaderSwitcherLabel>
                    {stack.constructs.byType.RDS!.map((item) => {
                      const names = databases.data?.[item.addr] || [];
                      return names.map((name) => (
                        <HeaderSwitcherItem
                          to={`../${stack.info.StackName}/${item.addr}/${name}`}
                        >
                          {item.id}:{name}
                        </HeaderSwitcherItem>
                      ));
                    })}
                  </HeaderSwitcherGroup>
                ))}
            </HeaderSwitcher>
            <Button color="accent">Migrations</Button>
          </HeaderGroup>
        </Header>
        <Query>
          <Editor
            mode="sql"
            theme={dm.enabled ? "clouds_midnight" : "clouds"}
            ref={ref}
            height="240px"
            width="100%"
            name="editor"
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              tabSize: 3,
              highlightActiveLine: false,
              enableLiveAutocompletion: true,
              showPrintMargin: false,
              fontSize: 14,
              fontFamily: "JetBrains Mono",
              showGutter: false,
            }}
          />
          <QueryToolbar>
            {!executeSql.data && !executeSql.error && (
              <div>Ctrl + Enter to invoke</div>
            )}
            {executeSql.error && (
              <Badge color="danger">
                {(executeSql.error as any).toString()}
              </Badge>
            )}
            {executeSql.data && executeSql.data.updated > 0 && (
              <Badge color="success">
                {executeSql.data.updated}{" "}
                {executeSql.data.updated > 1 ? "Rows" : "Row"} Updated
              </Badge>
            )}
            {executeSql.data &&
              executeSql.data.updated === 0 &&
              executeSql.data.rows.length === 0 && (
                <Badge color="success">Query executed</Badge>
              )}

            {executeSql.data &&
              executeSql.data.updated === 0 &&
              executeSql.data.rows.length > 0 && (
                <Badge color="success">
                  {executeSql.data.rows.length}{" "}
                  {executeSql.data.rows.length > 1 ? "Rows" : "Row"}
                </Badge>
              )}

            <Button
              type="submit"
              style={{ width: 100 }}
              color="highlight"
              onClick={runQuery}
              disabled={executeSql.isLoading}
            >
              {executeSql.isLoading ? (
                <Spinner size="sm" color="accent" />
              ) : (
                "Execute"
              )}
            </Button>
          </QueryToolbar>
        </Query>
        <Content>
          <Table.Root flush>
            <Table.Head>
              <Table.Row>
                {executeSql.data &&
                  executeSql.data.columns &&
                  executeSql.data.columns.map((column: any, idx: number) => (
                    <Table.Header key={idx}>{column}</Table.Header>
                  ))}
              </Table.Row>
            </Table.Head>

            <Table.Body>
              {executeSql.data &&
                executeSql.data.rows &&
                executeSql.data.rows.map((u, i) => (
                  <Table.Row key={i}>
                    {u.map((v, idx) => (
                      <Table.Cell key={idx}>{v || "<null>"}</Table.Cell>
                    ))}
                  </Table.Row>
                ))}
            </Table.Body>
          </Table.Root>
        </Content>
      </Main>
    </Root>
  );
}
