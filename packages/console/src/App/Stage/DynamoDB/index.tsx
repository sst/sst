import { BiScan, BiFilterAlt, BiCodeCurly, BiTrash } from "react-icons/bi";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import { useStacks } from "~/data/aws";
import { styled } from "~/stitches.config";
import {
  Header,
  HeaderGroup,
  HeaderSwitcher,
  HeaderSwitcherGroup,
  HeaderSwitcherItem,
  HeaderSwitcherLabel,
  HeaderTitle,
} from "../components";
import {
  Button,
  Row,
  SidePanel,
  Spinner,
  Stack,
  Table,
  Tabs,
} from "~/components";
import { getTable, queryTable, ScanItem, scanTable } from "~/data/aws/dynamodb";
import { itemToData } from "dynamo-converters";
import { useEffect, useState } from "react";
import { Update } from "./Update";
import { Create } from "./Create";
import {
  useForm,
  SubmitHandler,
  UseFormReturn,
  useFieldArray,
  Controller,
  UseFieldArrayReturn,
  FieldValues,
} from "react-hook-form";
import { useQueryClient, UseQueryResult } from "react-query";

export function DynamoDB() {
  const stacks = useStacks();
  const tables = stacks?.data?.constructs.byType["Table"] || [];
  return (
    <Routes>
      <Route path=":stack/:table/:index/:mode/*" element={<Explorer />} />
      {tables.length > 0 && (
        <Route
          path="*"
          element={
            <Navigate
              replace
              to={`${tables[0].stack}/${tables[0].data.tableName}/primary/scan`}
            />
          }
        />
      )}
    </Routes>
  );
}

const Root = styled("div", {
  width: "100%",
  overflow: "hidden",
});

const Content = styled("div", {
  overflow: "auto",
  flexGrow: 1,
});

const TabRow = styled(Row, {
  gap: "$sm",
  justifyContent: "space-between",
});

type Params = {
  stack?: string;
  table?: string;
  index?: string;
  mode?: string;
  "*"?: string;
};

const UpdatePanel = styled(SidePanel.Root, {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  backgroundColor: "$loContrast",
});

const Container = styled("div", {
  padding: "$sm",
  display: "flex",
  flexDirection: "column",
  gap: "$sm",
  alignItems: "self-start",
});

function IndexSwitcher(props: { params: Params }) {
  const { params } = props;
  const table = getTable(params.table!, params.index!);

  if (table.isLoading) return <Spinner />;

  return (
    <Stack space="0">
      <HeaderSwitcher
        value={
          params.index === "primary" ? params.index : params.index.slice(4)
        }
      >
        <HeaderSwitcherItem
          to={`../${params.stack}/${params.table}/primary/${params.mode}`}
        >
          Primary
        </HeaderSwitcherItem>
        {table.data.Table.LocalSecondaryIndexes &&
          table.data.Table.LocalSecondaryIndexes.map((index, idx) => (
            <HeaderSwitcherGroup key={idx}>
              <HeaderSwitcherLabel>Local indexes</HeaderSwitcherLabel>
              <HeaderSwitcherItem
                key={index.IndexName}
                to={`../${params.stack}/${params.table}/${
                  "loc-" + index.IndexName
                }/${params.mode}`}
              >
                {index.IndexName}
              </HeaderSwitcherItem>
            </HeaderSwitcherGroup>
          ))}
        {table.data.Table.GlobalSecondaryIndexes &&
          table.data.Table.GlobalSecondaryIndexes.map((index, idx) => (
            <HeaderSwitcherGroup key={idx}>
              <HeaderSwitcherLabel>Global indexes</HeaderSwitcherLabel>
              <HeaderSwitcherItem
                key={index.IndexName}
                to={`../${params.stack}/${params.table}/${
                  "glo-" + index.IndexName
                }/${params.mode}`}
              >
                {index.IndexName}
              </HeaderSwitcherItem>
            </HeaderSwitcherGroup>
          ))}
      </HeaderSwitcher>
    </Stack>
  );
}

const TableView = (props: {
  scan: UseQueryResult<ScanItem>;
  setSelectedRow: ([key, value]: any) => void;
}) => {
  return (
    <Table.Root flush>
      <Table.Head>
        <Table.Row>
          {props.scan.data.columns.map((col, idx) => (
            <Table.Header key={idx}>{col}</Table.Header>
          ))}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {props.scan.data.Items.map((item, idx) => (
          <Table.Row
            key={idx}
            onClick={() => {
              props.setSelectedRow(itemToData(item));
            }}
          >
            {new Array(props.scan.data.columns.length)
              .fill(0)
              .map((t, idx: number) => (
                <Table.Cell key={idx}>
                  {typeof itemToData(item)[props.scan.data.columns[idx]] ===
                    "object" ||
                  typeof itemToData(item)[props.scan.data.columns[idx]] ===
                    "boolean"
                    ? JSON.stringify(
                        itemToData(item)[props.scan.data.columns[idx]]
                      )
                    : itemToData(item)[props.scan.data.columns[idx]]}
                </Table.Cell>
              ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

const FilterView = (props: {
  filtersForm: UseFormReturn<Filter>;
  filterFieldArray: UseFieldArrayReturn<FieldValues, never, "id">;
}) => {
  const { filterFieldArray, filtersForm } = props;

  const types = ["type", "string", "number", "boolean"];

  const conditions: any = {
    string: [
      "=",
      "<>",
      ">",
      "<",
      ">=",
      "<=",
      "contains",
      "not_contains",
      "begins_with",
    ],
    number: ["=", "<>", ">", "<", ">=", "<="],
    boolean: ["=", "<>"],
  };

  return (
    <Stack space="sm">
      <form>
        <Stack space="sm">
          {filterFieldArray.fields.map((item, index) => (
            <Row key={item.id}>
              <Controller
                name={`filters.${index}.attr`}
                control={filtersForm.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    autoComplete="off"
                    placeholder="Attribute name"
                  />
                )}
              />
              <Controller
                name={`filters.${index}.type`}
                control={filtersForm.control}
                render={({ field }) => (
                  <Select {...field}>
                    {types.map((type, idx) => (
                      <option key={idx} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                )}
              />
              <Controller
                name={`filters.${index}.condition`}
                control={filtersForm.control}
                render={({ field }) => (
                  <Select {...field}>
                    {filtersForm.watch(`filters.${index}.type`) &&
                      conditions[
                        filtersForm.watch(`filters.${index}.type`)
                      ].map((condition: string) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                  </Select>
                )}
              />
              <Controller
                name={`filters.${index}.val`}
                control={filtersForm.control}
                render={({ field }) => (
                  <Input autoComplete="off" placeholder="value" {...field} />
                )}
              />
              <Button
                color="ghost"
                onClick={() => {
                  filterFieldArray.remove(index);
                }}
              >
                <BiTrash />
              </Button>
            </Row>
          ))}
        </Stack>
      </form>
      <Row>
        <Button
          color="accent"
          onClick={() =>
            filterFieldArray.append({
              attr: "",
              condition: "",
              type: "",
              val: "",
            })
          }
        >
          Add filter
        </Button>
        {filterFieldArray.fields.length > 0 && (
          <Button color="accent" onClick={() => filterFieldArray.remove()}>
            Reset
          </Button>
        )}
      </Row>
    </Stack>
  );
};

const Input = styled("input", {
  padding: "$sm",
  border: "1px solid $border",
  outline: "none",
  fontFamily: "$sans",
  display: "block",
  width: 250,
  background: "$accent",
  color: "$hiContrast",
});

const Select = styled("select", {
  padding: "$sm",
  border: "1px solid $border",
  outline: "none",
  fontFamily: "$sans",
  background: "$accent",
  color: "$hiContrast",
  width: 100,
});

const Center = styled("div", {
  display: "grid",
  placeItems: "center",
  height: "100vh",
  position: "absolute",
  top: 0,
  left: 0,
});

type Filter = {
  attr: string;
  type: string;
  condition: string;
  val: string;
  filters: Array<any>;
};

export function Explorer() {
  const stacks = useStacks();
  const nav = useNavigate();
  const params = useParams<Params>();
  const tables = stacks?.data?.constructs.byType["Table"] || [];
  const [selectedRow, setSelectedRow] = useState({});
  const [current, setCurrent] = useState(0);
  const [pages, setPages] = useState(0);
  const [scanFilter, setScanFilter] = useState([]);

  const table = getTable(params.table!, params.index!);
  const queryForm = useForm<Inputs>();
  const createForm = useForm<{ json: string }>();

  const filtersForm = useForm<Filter>();

  const filterFieldArray = useFieldArray({
    name: "filters" as never,
    control: filtersForm.control,
  });

  return (
    <Root>
      <Header>
        <HeaderTitle>DynamoDB</HeaderTitle>
        {tables.length > 0 && (
          <HeaderGroup>
            <HeaderSwitcher value={`${tables[0].stack} / ${params.table}`}>
              {stacks.data?.all.map((stack) => (
                <HeaderSwitcherGroup key={stack.info.StackId}>
                  <HeaderSwitcherLabel>
                    {stack.info.StackName}
                  </HeaderSwitcherLabel>
                  {stack.constructs.byType
                    .Table!.filter((x) => x.data.tableName)
                    .map((table) => (
                      <HeaderSwitcherItem
                        key={table.stack + table.addr}
                        to={`../${table.stack}/${table.data.tableName}/primary/${params.mode}`}
                      >
                        {table.id}
                      </HeaderSwitcherItem>
                    ))}
                </HeaderSwitcherGroup>
              ))}
            </HeaderSwitcher>
          </HeaderGroup>
        )}
      </Header>
      <Content>
        <Tabs.Root
          defaultValue={params.mode!}
          onValueChange={(value) =>
            nav(`../${params.stack}/${params.table}/${params.index}/${value}`)
          }
        >
          <Tabs.List>
            <Tabs.Trigger value="scan">
              <TabRow>
                <BiScan />
                Scan
              </TabRow>
            </Tabs.Trigger>
            <Tabs.Trigger value="query">
              <TabRow>
                <BiFilterAlt />
                Query
              </TabRow>
            </Tabs.Trigger>
            <Tabs.Trigger value="create">
              <TabRow>
                <BiCodeCurly /> Create
              </TabRow>
            </Tabs.Trigger>
          </Tabs.List>
          {table.isLoading ? (
            <Row css={{ padding: "$sm" }}>
              <Spinner />
            </Row>
          ) : (
            <>
              <Tabs.Content value="scan">
                <Scan
                  params={params}
                  table={table}
                  setSelectedRow={setSelectedRow}
                  current={current}
                  setCurrent={setCurrent}
                  pages={pages}
                  setPages={setPages}
                  filtersForm={filtersForm}
                  filterFieldArray={filterFieldArray}
                  setScanFilter={setScanFilter}
                  scanFilter={scanFilter}
                />
              </Tabs.Content>
              <Tabs.Content value="query">
                <Query
                  params={params}
                  table={table}
                  setSelectedRow={setSelectedRow}
                  form={queryForm}
                />
              </Tabs.Content>
              <Tabs.Content value="create">
                <Create params={params} form={createForm} />
              </Tabs.Content>
            </>
          )}
        </Tabs.Root>
      </Content>
      {table.data && (
        <UpdatePanel hidden={Object.keys(selectedRow).length === 0}>
          <SidePanel.Header>
            Editor
            <SidePanel.Close onClick={() => setSelectedRow({})} />
          </SidePanel.Header>
          <SidePanel.Content>
            <Update
              params={params!}
              initialData={selectedRow}
              Pk={table.data.Pk}
              Sk={table.data.Sk}
              setSelectedRow={setSelectedRow}
              current={current}
            />
          </SidePanel.Content>
        </UpdatePanel>
      )}
    </Root>
  );
}

const Pagination = styled("div", {
  display: "flex",
  maxWidth: 200,
  overflow: "auto",
  textOverflow: "ellipsis",
});

const Page = styled("div", {
  padding: "$sm",
  fontSize: "$sm",
  minWidth: 0,
  cursor: "pointer",
  variants: {
    active: {
      true: {
        background: "$accent",
      },
    },
  },
});

const Scan = (props: {
  params: Params;
  table: any;
  setSelectedRow: (data: any) => void;
  current: number;
  setCurrent: (current: number) => void;
  pages: number;
  setPages: (pages: number) => void;
  filtersForm: UseFormReturn<Filter>;
  filterFieldArray: UseFieldArrayReturn<Filter, never, "id">;
  setScanFilter: (filter: (string | any[])[]) => void;
  scanFilter: any[];
}) => {
  const {
    params,
    table,
    setSelectedRow,
    current,
    setCurrent,
    pages,
    setPages,
    filtersForm,
    filterFieldArray,
    setScanFilter,
    scanFilter,
  } = props;

  const qc = useQueryClient();
  const scan = scanTable(
    params.table,
    table.data.Pk!,
    params.index,
    table.data.Sk!,
    current,
    scanFilter
  );

  const resetScan = async () => {
    setCurrent(0);
    setPages(0);
    await qc.resetQueries({
      queryKey: "scanTable",
    });
  };

  const getFilter = () => {
    const filters: any = [];
    filtersForm.watch().filters.map((filter: Filter, i: number) => {
      filters.push([
        filter.attr,
        filter.condition,
        filter.type === "number"
          ? Number(filter.val)
          : filter.type === "boolean"
          ? filter.val === "true"
          : filter.val,
      ]);
      if (i !== filtersForm.watch().filters.length - 1) {
        filters.push("AND");
      }
    });
    setScanFilter(filters);
  };

  useEffect(() => {
    if (current > 0) {
      (async () => {
        const { data } = await scan.refetch();
        if (data.ScannedCount !== 0) {
          if (current > pages) setPages(current);
        } else setCurrent(1);
      })();
    }
  }, [current]);

  return (
    <Stack space="0">
      <Container>
        <IndexSwitcher params={params} />
        <FilterView
          filtersForm={filtersForm}
          filterFieldArray={filterFieldArray}
        />
        <Row>
          <Button
            onClick={async () => {
              await resetScan();
              getFilter();
              setCurrent(1);
            }}
          >
            Scan
          </Button>
          {scan.data && (
            <Row alignHorizontal="end">
              <Page
                onClick={() => {
                  if (current > 1) setCurrent(current - 1);
                }}
              >
                {"<"}
              </Page>

              <Pagination>
                {new Array(pages).fill(0).map((_, i) => (
                  <Page
                    active={current - 1 === i}
                    key={i}
                    onClick={() => setCurrent(i + 1)}
                  >
                    {i + 1}
                  </Page>
                ))}
              </Pagination>

              <Page
                onClick={() => {
                  if (scan.data.ScannedCount !== 0) setCurrent(current + 1);
                }}
              >
                {">"}
              </Page>
            </Row>
          )}
        </Row>
      </Container>
      {scan.data && scan.data.columns && (
        <TableView scan={scan} setSelectedRow={setSelectedRow} />
      )}
    </Stack>
  );
};

type Inputs = {
  Pk: string;
  Sk?: string | undefined;
};

const Query = (props: {
  params: Params;
  table: any;
  setSelectedRow: (data: any) => void;
  form: UseFormReturn<Inputs>;
}) => {
  const { params, table, form } = props;
  const query = queryTable(
    params.table,
    table.data.Pk!,
    form.watch("Pk"),
    table.data.Sk!,
    form.watch("Sk") === "" ? undefined : form.watch("Sk"),
    params.index
  );
  const onSubmit: SubmitHandler<Inputs> = () => query.refetch();

  return (
    <Stack space="sm">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Row>
          <IndexSwitcher params={params} />
          <Input
            {...form.register("Pk")}
            placeholder={table.data.Pk + " (Pk)"}
            autoComplete="off"
          />
          <Input
            {...form.register("Sk")}
            placeholder={table.data.Sk + " (Sk)"}
            autoComplete="off"
          />
          <Button type="submit">Query</Button>
        </Row>
      </form>
      {query.data && query.data.columns && (
        <TableView scan={query} setSelectedRow={props.setSelectedRow} />
      )}
    </Stack>
  );
};
