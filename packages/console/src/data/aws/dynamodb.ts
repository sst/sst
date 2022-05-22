import {
  DeleteItemCommand,
  DescribeTableCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";
import { useClient } from "./client";
import { marshall } from "@aws-sdk/util-dynamodb";

export function useDescribeTable(name?: string) {
  const dynamo = useClient(DynamoDBClient);
  return useQuery({
    queryKey: ["describeTable", name],
    queryFn: async () => {
      const response = await dynamo.send(
        new DescribeTableCommand({
          TableName: name,
        })
      );
      return response;
    },
    enabled: Boolean(name),
    refetchOnWindowFocus: false,
  });
}

export interface ScanOpts {
  version: number;
  pk?: Filter;
  sk?: Filter;
  filters: Filter[];
}

interface Filter {
  key: string;
  op: "=" | "<>" | "<" | "<=" | ">" | ">=";
  value: string;
}

export function useScanTable(name?: string, index?: string, opts?: ScanOpts) {
  const dynamo = useClient(DynamoDBClient);
  return useInfiniteQuery({
    queryKey: ["scanTable", { name, index, opts }],
    queryFn: async (ctx) => {
      const isQuery = opts.pk?.op === "=";

      const filters = [
        !isQuery && opts.pk,
        !isQuery && opts.sk,
        ...opts.filters,
      ].filter((item) => {
        return Boolean(item?.op);
      });

      const filterExpression = filters
        .filter(
          (item) => !isQuery || ![opts.pk?.key, opts.sk?.key].includes(item.key)
        )
        .map((item) => `#${item.key} ${item.op} :${item.key}`);

      const expressionAttributes = [opts.pk, opts.sk, ...opts.filters]
        .filter((item) => Boolean(item?.op))
        .map((item) => {
          let val = undefined;
          try {
            val = JSON.parse(item.value);
          } catch (e) {
            val = item.value;
          }
          return [
            `:${item.key}`,
            marshall({ val }, { removeUndefinedValues: true }).val,
          ];
        });

      const expressionAttributesNames = [opts.pk, opts.sk, ...opts.filters]
        .filter((item) => Boolean(item?.op))
        .map((item) => [`#${item.key}`, item.key]);
      const params: ScanCommandInput = {
        TableName: name,
        IndexName: index === "Primary" ? undefined : index,
        ExclusiveStartKey: ctx.pageParam,
        Limit: 50,
        FilterExpression: filterExpression.length
          ? filterExpression.join(" AND ")
          : undefined,
        ExpressionAttributeNames: expressionAttributesNames.length
          ? Object.fromEntries(expressionAttributesNames)
          : undefined,
        ExpressionAttributeValues: expressionAttributes.length
          ? Object.fromEntries(expressionAttributes)
          : undefined,
      };

      const response = await dynamo.send(
        isQuery
          ? new QueryCommand({
              ...params,
              KeyConditionExpression: (["pk", "sk"] as const)
                .map((key) => opts[key])
                .filter((item) => Boolean(item?.op))
                .map((item) => `#${item.key} ${item.op} :${item.key}`)
                .join(" AND "),
            })
          : new ScanCommand(params)
      );
      // if (!response.Count) throw new Error("No items");
      return response;
    },
    refetchOnWindowFocus: false,
    retry: false,
    enabled: Boolean(index) && Boolean(name) && Boolean(opts),
    getNextPageParam: (page: ScanCommandOutput) => page.LastEvaluatedKey,
  });
}

export function useDeleteItem() {
  const dynamo = useClient(DynamoDBClient);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: {
      tableName: string;
      keys: any;
      original: any;
    }) => {
      const response = await dynamo.send(
        new DeleteItemCommand({
          TableName: opts.tableName,
          Key: marshall(opts.keys, {
            removeUndefinedValues: true,
          }),
        })
      );
      qc.setQueriesData(["scanTable"], (old: any) => {
        if (!old) return;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            Items: page.Items.filter((item: any) => opts.original !== item),
          })),
        };
      });
      return response;
    },
  });
}

export function usePutItem() {
  const dynamo = useClient(DynamoDBClient);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: {
      tableName: string;
      item: any;
      original: any;
    }) => {
      const marshalled = marshall(opts.item, { removeUndefinedValues: true });
      const response = await dynamo.send(
        new PutItemCommand({
          TableName: opts.tableName,
          Item: marshalled,
        })
      );
      if (!opts.original) {
        qc.invalidateQueries(["scanTable"]);
        return;
      }
      qc.setQueriesData(["scanTable"], (old: any) => {
        if (!old) return;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            Items: page.Items.map((item: any) => {
              if (opts.original !== item) return item;
              return marshalled;
            }),
          })),
        };
      });
      return response;
    },
  });
}

export function useGetItem(table: string, keys: Record<string, string>) {
  const dynamo = useClient(DynamoDBClient);
  return useQuery({
    queryKey: ["getItem", keys],
    keepPreviousData: false,
    queryFn: async () => {
      const response = await dynamo.send(
        new GetItemCommand({
          TableName: table,
          Key: marshall(keys, {
            removeUndefinedValues: true,
          }),
        })
      );
      return response;
    },
    enabled: Boolean(keys),
    refetchOnWindowFocus: false,
  });
}
