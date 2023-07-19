import {
  Badge,
  Button,
  Input,
  Row,
  Select,
  Spacer,
  Spinner,
  Stack,
  Table,
} from "~/components";
import { styled } from "~/stitches.config";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderGroup,
  HeaderSwitcherLabel,
  HeaderSwitcherGroup,
} from "../components";
import { useParams, Route, Routes, Navigate } from "react-router-dom";
import { useConstruct, useStacks } from "~/data/aws";
import { useForm, useFieldArray } from "react-hook-form";
import { ScanOpts, useDescribeTable, useScanTable } from "~/data/aws/dynamodb";
import { useMemo, useState } from "react";
import { BiTrash } from "react-icons/bi";
import { sortBy, uniq } from "remeda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Editor, useEditor } from "./Editor";

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

const Error = styled("div", {
  padding: "$lg",
});

const Content = styled("div", {
  overflow: "auto",
  flexGrow: 1,
});

const Filters = styled("form", {
  padding: "$lg",
  borderBottom: "1px solid $accent",
});

const Empty = styled("div", {
  padding: "$lg",
});

const HotkeyMessage = styled("div", {
  color: "$gray10",
  fontSize: "$sm",
});

const KeyFilter = styled("div", {
  display: "grid",
  alignItems: "center",
  gap: "$md",
  gridTemplateColumns: "250px 220px 250px 0px",
});

const KeyFilterRemove = styled(BiTrash, {
  cursor: "pointer",
});

const Paging = styled("div", {
  display: "flex",
  height: 32,
});

const Page = styled("div", {
  userSelect: "none",
  display: "inline-flex",
  cursor: "pointer",
  height: "100%",
  borderRadius: 4,
  marginLeft: "$sm",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "$sm",
  fontWeight: "bold",
  width: "auto",
  aspectRatio: 1,
  variants: {
    active: {
      true: {
        border: "1px solid $highlight",
      },
    },
    disabled: {
      true: {
        pointerEvents: "none",
        cursor: "initial",
        opacity: 0.2,
      },
    },
  },
});

export function Dynamo() {
  return (
    <Root>
      <Routes>
        <Route path=":stack/:table/:index/*" element={<Explorer />} />
        <Route path="*" element={<Explorer />} />
      </Routes>
    </Root>
  );
}

function Explorer() {
  const stacks = useStacks();
  const tables = stacks.data?.constructs.byType.Table || [];
  const params = useParams();
  const table = useConstruct("Table", params.stack!, params.table!);
  const description = useDescribeTable(table?.data.tableName);
  const [scanOpts, setScanOpts] = useState<ScanOpts>({
    version: 0,
    filters: [],
  });
  const scanTable = useScanTable(table?.data.tableName, params.index, scanOpts);
  const [pageNumber, setPageNumber] = useState(0);
  const page = scanTable.data?.pages[pageNumber];

  const form = useForm<ScanOpts>({});
  const filters = useFieldArray({
    control: form.control,
    name: "filters",
  });
  const onSubmit = form.handleSubmit(async (data) => {
    console.log("Submitting form");
    setScanOpts({
      ...data,
      version: scanOpts.version + 1,
    });
    setPageNumber(0);
  });

  const schema = useMemo(() => {
    const match =
      description.data?.Table?.GlobalSecondaryIndexes?.find(
        (x) => x.IndexName === params.index
      )?.KeySchema || description.data?.Table?.KeySchema;
    if (!match) return [];
    return match;
  }, [description.data, params.index]);

  const selectedIndex = useMemo(() => {
    return {
      pk: schema.find((x) => x.KeyType === "HASH"),
      sk: schema.find((x) => x.KeyType === "RANGE"),
    };
  }, [schema]);

  const primaryIndex = useMemo(() => {
    return {
      pk: description.data?.Table?.KeySchema.find((x) => x.KeyType === "HASH"),
      sk: description.data?.Table?.KeySchema.find((x) => x.KeyType === "RANGE"),
    };
  }, [description.data]);

  const columns = useMemo(
    () =>
      uniq(
        [
          selectedIndex.pk?.AttributeName,
          selectedIndex.sk?.AttributeName,
          ...(page?.Items.map(Object.keys).flat() || []),
        ].filter((x) => x)
      ),
    [page]
  );

  const editor = useEditor(table?.data.tableName);

  if (tables.length > 0 && !table)
    return (
      <Navigate replace to={`${tables[0].stack}/${tables[0].addr}/Primary`} />
    );

  return (
    <Root>
      <Main>
        <Header>
          <HeaderTitle>DynamoDB</HeaderTitle>

          {table && (
            <HeaderGroup>
              <HeaderSwitcher value={`${params.stack} / ${table.id}`}>
                {stacks.data?.all
                  .filter((s) => s.constructs.byType.Table?.length || 0 > 0)
                  .map((stack) => (
                    <HeaderSwitcherGroup key={stack.info.StackName}>
                      <HeaderSwitcherLabel>
                        {stack.info.StackName}
                      </HeaderSwitcherLabel>
                      {stack.constructs.byType.Table!.map((item) => {
                        return (
                          <HeaderSwitcherItem
                            key={item.addr}
                            to={`../${stack.info.StackName}/${item.addr}/Primary`}
                          >
                            {item.id}
                          </HeaderSwitcherItem>
                        );
                      })}
                    </HeaderSwitcherGroup>
                  ))}
              </HeaderSwitcher>
              <Button color="accent" onClick={() => editor.create()}>
                Create Item
              </Button>
            </HeaderGroup>
          )}
        </Header>
        {table ? (
          <Filters onSubmit={onSubmit}>
            <Stack space="md">
              <Row alignVertical="center">
                {" "}
                <HeaderSwitcher value={params.index + " Index"}>
                  <HeaderSwitcherGroup>
                    <HeaderSwitcherLabel>Indexes</HeaderSwitcherLabel>
                    <HeaderSwitcherItem
                      to={`../${params.stack}/${params.table}/Primary`}
                    >
                      Primary
                    </HeaderSwitcherItem>
                    {sortBy(
                      description.data?.Table?.GlobalSecondaryIndexes || [],
                      (x) => x.IndexName
                    ).map((index) => {
                      return (
                        <HeaderSwitcherItem
                          key={index.IndexName}
                          to={`../${params.stack}/${params.table}/${index.IndexName}`}
                        >
                          {index.IndexName}
                        </HeaderSwitcherItem>
                      );
                    })}
                  </HeaderSwitcherGroup>
                </HeaderSwitcher>
                <Spacer />
                <Button
                  type="button"
                  color="accent"
                  onClick={() => filters.append({})}
                >
                  Add Filter
                </Button>
              </Row>
              {(["pk", "sk"] as const)
                .filter((x) => selectedIndex[x])
                .map((key) => (
                  <KeyFilter key={key}>
                    <Input disabled value={selectedIndex[key].AttributeName} />
                    <Input
                      {...form.register(`${key}.key`)}
                      type="hidden"
                      value={selectedIndex[key].AttributeName}
                    />
                    <Select {...form.register(`${key}.op`)}>
                      <option defaultChecked value="">
                        is anything
                      </option>
                      <option value="=">equal to</option>
                      <option value="<>">not equal to</option>
                      <option value="<">less than</option>
                      <option value="<=">less than or equal</option>
                      <option value=">">greater than</option>
                      <option value=">=">greater than or equal</option>
                    </Select>
                    {form.watch(`${key}.op`) && (
                      <Input
                        {...form.register(`${key}.value`)}
                        placeholder="value"
                      />
                    )}
                  </KeyFilter>
                ))}
              {filters.fields.map((_field, index) => {
                return (
                  <KeyFilter key={index}>
                    <Input
                      {...form.register(`filters.${index}.key`)}
                      placeholder="Attribute name"
                    />
                    <Select {...form.register(`filters.${index}.op`)}>
                      <option value="=">equal to</option>
                      <option value="<>">not equal to</option>
                      <option value="<">less than</option>
                      <option value="<=">less than or equal</option>
                      <option value=">">greater than</option>
                      <option value=">=">greater than or equal</option>
                    </Select>
                    <Input
                      {...form.register(`filters.${index}.value`)}
                      placeholder="Value"
                    />
                    <KeyFilterRemove onClick={() => filters.remove(index)} />
                  </KeyFilter>
                );
              })}
              <Row alignHorizontal="end">
                {scanTable.data?.pages.length > 0 && (
                  <Paging>
                    <Page
                      disabled={pageNumber === 0}
                      onClick={() => setPageNumber(Math.max(0, pageNumber - 1))}
                    >
                      {"<"}
                    </Page>
                    {scanTable.data?.pages.map((_, index) => (
                      <Page
                        key={index}
                        onClick={() => setPageNumber(index)}
                        active={pageNumber === index}
                      >
                        {index + 1}
                      </Page>
                    ))}
                    <Page
                      disabled={
                        !scanTable.hasNextPage &&
                        scanTable.data?.pages?.length === pageNumber + 1
                      }
                      onClick={async () => {
                        const next = pageNumber + 1;
                        if (next > scanTable.data?.pages.length - 1) {
                          const result = await scanTable.fetchNextPage();
                          if (result.data?.pages.length > next) {
                            setPageNumber(next);
                            return;
                          }
                        }
                        if (scanTable.data?.pages.length > next)
                          setPageNumber(next);
                      }}
                    >
                      {">"}
                    </Page>
                  </Paging>
                )}
                <Button style={{ width: 90 }}>
                  {!scanTable.isFetching &&
                    (form.watch("pk.op") === "=" ? "Query" : "Scan")}
                  {scanTable.isLoading && <Spinner size="sm" color="accent" />}
                </Button>
              </Row>
            </Stack>
          </Filters>
        ) : (
          <Empty>No DynamoDB tables in this app</Empty>
        )}
        <Content>
          {page && page.Count > 0 && (
            <Table.Root flush>
              <Table.Head>
                <Table.Row>
                  {columns.map((item, idx) => (
                    <Table.Header key={idx}>{item}</Table.Header>
                  ))}
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {page.Items.map((item, idx) => {
                  const json = unmarshall(item);
                  return (
                    <Table.Row
                      clickable
                      key={idx}
                      onClick={() =>
                        editor.edit(item, {
                          [primaryIndex.pk?.AttributeName]:
                            json[primaryIndex.pk?.AttributeName],
                          [primaryIndex.sk?.AttributeName]:
                            json[primaryIndex.sk?.AttributeName],
                        })
                      }
                    >
                      {columns.map((col) => (
                        <Table.Cell key={col}>
                          {renderValue(json[col])}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
          {scanTable.isError && (
            <Error>{(scanTable.error as any).message}</Error>
          )}
          {scanTable.isSuccess && (!page || page.Count === 0) && (
            <Error>No items</Error>
          )}
        </Content>
      </Main>
      <Editor {...editor.props} />
    </Root>
  );
}

function renderValue(val: any): string {
  switch (typeof val) {
    case "bigint":
    case "number":
    case "string":
    case "boolean":
      return val.toString();
    case "object":
      if (ArrayBuffer.isView(val))
        return "Binary: " + Buffer.from(val as any).toString("base64");
      return JSON.stringify(val, replacer, 2);
    case "undefined":
      return "<null>";
    default:
      return "<unknown>";
  }
}

function replacer(_k: string, val: unknown) {
  if (val instanceof Set) return Array.from(val);
  return val;
}
