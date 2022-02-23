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
import { useRDSExecute } from "~/data/aws/rds";
import {
  Header,
  HeaderTitle,
  HeaderSwitcher,
  HeaderSwitcherItem,
  HeaderGroup,
  HeaderSwitcherLabel,
  HeaderSwitcherGroup,
} from "../components";
import { useParams, Route, Routes, Navigate, Link } from "react-router-dom";
import { useConstruct, useStacks } from "~/data/aws";
import { useForm, useFieldArray } from "react-hook-form";
import { useDescribeTable } from "~/data/aws/dynamodb";
import { useMemo } from "react";
import { BiTrash } from "react-icons/bi";

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

  const form = useForm({});
  const filters = useFieldArray({
    control: form.control,
    name: "filters",
  });
  const onSubmit = form.handleSubmit(async (data) => {
    console.log(data);
  });

  if (tables.length > 0 && !table)
    return (
      <Navigate replace to={`${tables[0].stack}/${tables[0].addr}/primary`} />
    );

  const schema = useMemo(() => {
    const match =
      description.data?.Table?.GlobalSecondaryIndexes.find(
        (x) => x.IndexName === params.index
      )?.KeySchema || description.data?.Table?.KeySchema;
    if (!match) return [];
    return match;
  }, [description.data, params.index]);

  const index = useMemo(() => {
    return {
      pk: schema.find((x) => x.KeyType === "HASH"),
      sk: schema.find((x) => x.KeyType === "RANGE"),
    };
  }, [schema]);

  return (
    <Root>
      <Main>
        <Header>
          <HeaderTitle>Dynamo</HeaderTitle>

          {table && (
            <HeaderGroup>
              <HeaderSwitcher value={`${params.stack} / ${table.id}`}>
                {stacks.data?.all
                  .filter((s) => s.constructs.byType.RDS?.length || 0 > 0)
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
                    {description.data?.Table?.GlobalSecondaryIndexes?.map(
                      (index) => {
                        return (
                          <HeaderSwitcherItem
                            key={index.IndexName}
                            to={`../${params.stack}/${params.table}/${index.IndexName}`}
                          >
                            {index.IndexName}
                          </HeaderSwitcherItem>
                        );
                      }
                    )}
                  </HeaderSwitcherGroup>
                </HeaderSwitcher>
                <Spacer />
                <Button color="accent" onClick={() => filters.append({})}>
                  Add Filter
                </Button>
              </Row>
              {(["pk", "sk"] as const)
                .filter((x) => index[x])
                .map((key) => (
                  <KeyFilter>
                    <Input disabled value={index[key].AttributeName} />
                    <Select {...form.register(`${key}.op`)}>
                      <option defaultChecked value="">
                        is anything
                      </option>
                      <option value="eq">equal to</option>
                      <option value="ne">not equal to</option>
                      <option value="lt">less than</option>
                      <option value="lte">less than or equal</option>
                      <option value="gt">greater than</option>
                      <option value="gte">greater than or equal</option>
                      <option value="contains">contains</option>
                      <option value="not_contains">does not contain</option>
                      <option value="begins_with">begins with</option>
                    </Select>
                    {form.watch(`${key}.op`) && (
                      <Input
                        {...form.register(`${key}.value`)}
                        placeholder="value"
                      />
                    )}
                  </KeyFilter>
                ))}
              {filters.fields.map((field, index) => {
                return (
                  <KeyFilter>
                    <Input
                      {...form.register(`filters.${index}.key`)}
                      placeholder="Attribute name"
                    />
                    <Select {...form.register(`filters.${index}.op`)}>
                      <option value="eq">equal to</option>
                      <option value="ne">not equal to</option>
                      <option value="lt">less than</option>
                      <option value="lte">less than or equal</option>
                      <option value="gt">greater than</option>
                      <option value="gte">greater than or equal</option>
                      <option value="contains">contains</option>
                      <option value="not_contains">does not contain</option>
                      <option value="begins_with">begins with</option>
                    </Select>
                    <Input
                      {...form.register(`filters.${index}.value`)}
                      placeholder="Value"
                    />
                    <BiTrash onClick={() => filters.remove(index)} />
                  </KeyFilter>
                );
              })}
              <Row alignHorizontal="justify" alignVertical="center">
                <HotkeyMessage></HotkeyMessage>
                <Button>
                  {form.watch("pk.op") === "eq" ? "Query" : "Scan"}
                </Button>
              </Row>
            </Stack>
          </Filters>
        ) : (
          <Empty>No Dynamo tables in this app</Empty>
        )}
        <Content>
          <Table.Root flush>
            <Table.Head>
              <Table.Row>
                <Table.Header>Test</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body></Table.Body>
          </Table.Root>
        </Content>
      </Main>
    </Root>
  );
}
