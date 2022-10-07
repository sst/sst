import {
  Badge,
  Button,
  Row,
  SidePanel,
  Spacer,
  Spinner,
  Stack,
  Table,
} from "~/components";
import { styled } from "~/stitches.config";
import {
  useRDSExecute,
  getDatabases,
  useListMigrations,
  useRunMigration,
  MigrationInfo,
} from "~/data/aws/rds";
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
  Route,
  Routes,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useQueryClient } from "react-query";
import { useConstruct, useStacks } from "~/data/aws";
import { useHotkeys } from "@react-hook/hotkey";
import { useForm } from "react-hook-form";
import { useRef } from "react";

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

const Query = styled("form", {
  paddingBottom: "$md",
  borderBottom: "1px solid $accent",
});

const QueryTextArea = styled("textarea", {
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

const QueryToolbar = styled("div", {
  userSelect: "none",
  padding: "0 $lg",
  display: "flex",
  color: "$gray10",
  fontSize: "$sm",
  alignItems: "start",console/inde
  minHeight: 36,
  justifyContent: "space-between",
});

const Empty = styled("div", {
  padding: "$lg",
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
  const queryClient = useQueryClient();
  const databases = getDatabases(rdsClusters);
  const executeSql = useRDSExecute();

  const form = useForm<{ sql: string }>({
    defaultValues: {
      sql: "",
    },
  });
  const sqlField = form.register("sql");

  const onSubmit = form.handleSubmit(async (data) => {
    await queryClient.cancelMutations();
    await executeSql.mutateAsync({
      sql: data.sql,
      secretArn: cluster.data.secretArn,
      resourceArn: cluster.data.clusterArn,
      database: params.database!,
    });
    if (data.sql.includes("database")) await databases.refetch();
  });

  const loc = useLocation();
  const nav = useNavigate();
  const queryRef = useRef<HTMLTextAreaElement>();
  useHotkeys(window, [
    [["mod", "enter"], () => onSubmit()],
    [
      ["q"],
      (e) => {
        if (queryRef.current === document.activeElement) return;
        form.setFocus("sql");
        e.preventDefault();
      },
    ],
    [["esc"], () => queryRef.current?.blur()],
    [
      ["m"],
      () => {
        if (queryRef.current === document.activeElement) return;
        if (loc.pathname.endsWith("migrations")) {
          nav("./", { replace: true });
          return;
        }
        nav("migrations", { replace: true });
      },
    ],
  ]);

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

          {cluster && (
            <HeaderGroup>
              <HeaderSwitcher
                value={`${params.stack} / ${cluster.id}:${params.database}`}
              >
                {stacks.data?.all
                  .filter((s) => s.constructs.byType.RDS?.length || 0 > 0)
                  .map((stack) => (
                    <HeaderSwitcherGroup key={stack.info.StackName}>
                      <HeaderSwitcherLabel>
                        {stack.info.StackName}
                      </HeaderSwitcherLabel>
                      {stack.constructs.byType.RDS!.map((item) => {
                        const names = databases.data?.[item.addr] || [];
                        return names.map((name) => (
                          <HeaderSwitcherItem
                            key={name}
                            to={`../${stack.info.StackName}/${item.addr}/${name}`}
                          >
                            {item.id}:{name}
                          </HeaderSwitcherItem>
                        ));
                      })}
                    </HeaderSwitcherGroup>
                  ))}
              </HeaderSwitcher>
              <Routes>
                <Route
                  path="/"
                  element={
                    cluster.data.migrator && (
                      <Button as={Link} color="accent" to="migrations">
                        Migrations
                      </Button>
                    )
                  }
                />
              </Routes>
            </HeaderGroup>
          )}
        </Header>
        {cluster ? (
          <Query onSubmit={onSubmit}>
            <QueryTextArea
              spellCheck={false}
              autoFocus
              {...sqlField}
              ref={(r) => {
                sqlField.ref(r);
                queryRef.current = r!;
              }}
              rows={8}
              placeholder="Enter SQL"
            />
            <QueryToolbar>
              {!executeSql.data && !executeSql.error && (
                <div>
                  {navigator.platform.match(/Mac/) ? "Cmd" : "Ctrl"} + Enter run
                  query
                </div>
              )}
              {executeSql.error && (
                <Badge message color="danger">
                  {(executeSql.error as any).toString()}
                </Badge>
              )}
              {executeSql.data && executeSql.data.updated > 0 && (
                <Badge message color="success">
                  {executeSql.data.updated}{" "}
                  {executeSql.data.updated > 1 ? "rows" : "row"} updated
                </Badge>
              )}

              {executeSql.data && executeSql.data.updated === 0 && (
                <Badge message color="neutral">
                  {executeSql.data.rows.length}{" "}
                  {executeSql.data.rows.length === 1 ? "row" : "rows"}
                </Badge>
              )}

              <Spacer horizontal="lg" />
              <Button
                type="submit"
                style={{ width: 100 }}
                color="highlight"
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
        ) : (
          <Empty>No RDS clusters in this app</Empty>
        )}
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
                      <Table.Cell key={idx}>{v ?? "<null>"}</Table.Cell>
                    ))}
                  </Table.Row>
                ))}
            </Table.Body>
          </Table.Root>
        </Content>
      </Main>
      <Routes>
        <Route path="migrations" element={<Panel />} />
      </Routes>
    </Root>
  );
}

const MigrationRoot = styled("div", {
  border: "1px solid $border",
  borderRadius: 4,
  padding: "$md",
  lineHeight: 1.4,
  minHeight: 60,
  display: "flex",
  alignItems: "center",
  fontSize: "$sm",
  cursor: "pointer",
  justifyContent: "space-between",
  transition: "background 300ms",
  "&:hover": {
    background: "$accent",
    transition: "initial",
  },
  variants: {
    done: {
      true: {
        color: "$gray9",
      },
    },
  },
});

const MigrationName = styled("div", {
  fontWeight: 500,
});

const MigrationDate = styled("div", {
  fontSize: "$xs",
  color: "$gray11",
});

const MigrationInstructions = styled("div", {
  fontSize: "$sm",
  lineHeight: 1.5,
});

function Panel() {
  const params = useParams();
  const cluster = useConstruct("RDS", params.stack!, params.cluster!);
  const func = useConstruct(
    "Function",
    cluster.data.migrator?.stack!,
    cluster.data.migrator?.node!
  );

  const migrations = useListMigrations(func.data.arn, params.database!);
  const reset = useRunMigration(func.data.arn);

  return (
    <SidePanel.Root>
      <SidePanel.Header>
        <Row alignVertical="center">
          Migrations
          <Spacer horizontal="sm" />
          {migrations.isLoading && <Spinner size="sm" />}
        </Row>
        <Link to="../">
          <SidePanel.Close />
        </Link>
      </SidePanel.Header>
      <SidePanel.Content>
        <Stack space="md">
          <MigrationInstructions>
            You can reset your database to any migration by clicking on it.
          </MigrationInstructions>
          {migrations.data?.map((item) => (
            <Migration
              database={params.database!}
              info={item}
              arn={func.data.arn}
            />
          ))}
          <MigrationRoot
            done={true}
            onClick={() =>
              reset.mutate({
                database: params.database!,
                name: "",
              })
            }
          >
            <MigrationName>Initial</MigrationName>
            {reset.isLoading && <Spinner size="sm" />}
            {!reset.isLoading && (
              <Badge size="xs" color="neutral">
                Applied
              </Badge>
            )}
          </MigrationRoot>
        </Stack>
      </SidePanel.Content>
    </SidePanel.Root>
  );
}

type MigrationProps = {
  arn: string;
  database: string;
  info: MigrationInfo;
};

function Migration(props: MigrationProps) {
  const run = useRunMigration(props.arn);
  return (
    <MigrationRoot
      onClick={() =>
        run.mutate({ name: props.info.name, database: props.database })
      }
      done={props.info.executedAt != undefined}
    >
      <Row alignVertical="center" alignHorizontal="justify">
        <Stack space="0">
          <MigrationName>{props.info.name} </MigrationName>
          {props.info.executedAt && (
            <MigrationDate>
              {new Intl.DateTimeFormat([], {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(props.info.executedAt))}
            </MigrationDate>
          )}
        </Stack>
        {run.isLoading && <Spinner size="sm" />}

        {!run.isLoading && !props.info.executedAt && (
          <Badge color="success" size="xs">
            Apply
          </Badge>
        )}
        {!run.isLoading && props.info.executedAt && (
          <Badge color="neutral" size="xs">
            Applied
          </Badge>
        )}
      </Row>
    </MigrationRoot>
  );
}
