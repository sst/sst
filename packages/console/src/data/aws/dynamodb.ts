import {
  DeleteItemCommand,
  DescribeTableCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  ScanCommandOutput,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useClient } from "./client";
import { dataToItem, deltaToUpdateParams } from "dynamo-converters";
import * as expressionBuilder from "@faceteer/expression-builder";

export function getTable(name: string, index: string) {
  const dynamo = useClient(DynamoDBClient);
  return useQuery({
    queryKey: ["getTable", name, index],
    queryFn: async () => {
      let Pk = "",
        Sk = "";
      const response = await dynamo.send(
        new DescribeTableCommand({
          TableName: name,
        })
      );

      if (index.startsWith("loc-")) {
        Pk = response.Table.LocalSecondaryIndexes.find(
          (i) => i.IndexName === index.slice(4)
        ).KeySchema.find((i) => i.KeyType === "HASH").AttributeName;
        Sk = response.Table.LocalSecondaryIndexes.find(
          (i) => i.IndexName === index.slice(4)
        ).KeySchema.find((i) => i.KeyType === "RANGE")?.AttributeName;
      } else if (index.startsWith("glo-")) {
        Pk = response.Table.GlobalSecondaryIndexes.find(
          (i) => i.IndexName === index.slice(4)
        ).KeySchema.find((i) => i.KeyType === "HASH").AttributeName;
        Sk = response.Table.GlobalSecondaryIndexes.find(
          (i) => i.IndexName === index.slice(4)
        ).KeySchema.find((i) => i.KeyType === "RANGE")?.AttributeName;
      } else {
        Pk = response.Table.KeySchema.find(
          (i) => i.KeyType === "HASH"
        ).AttributeName;
        Sk = response.Table.KeySchema.find(
          (i) => i.KeyType === "RANGE"
        )?.AttributeName;
      }

      return {
        ...response,
        Pk,
        Sk,
      };
    },
    enabled: name.length > 0,
  });
}

export interface ScanItem extends ScanCommandOutput {
  columns: any[];
}

export function scanTable(
  tableName: string,
  Pk: string,
  index?: string,
  Sk?: string,
  page?: number,
  scanFilter?: any[]
) {
  const dynamo = useClient(DynamoDBClient);
  const qc = useQueryClient();

  return useQuery<ScanItem>({
    queryKey: ["scanTable", tableName, page, index],
    queryFn: async () => {
      // get the previous page last key from cache
      const startKey = qc.getQueryData<ScanItem>([
        "scanTable",
        tableName,
        page - 1,
        index,
      ])?.LastEvaluatedKey;

      //  gets the filter expression using 👉🏼 (https://github.com/faceteer/expression-builder)
      const filterExp =
        scanFilter.length === 0
          ? undefined
          : scanFilter.length > 1
          ? expressionBuilder.filter(scanFilter as any)
          : expressionBuilder.filter(scanFilter[0]);
      console.log(filterExp);

      const response = await dynamo.send(
        new ScanCommand({
          TableName: tableName,
          Limit: 50,
          ExclusiveStartKey: startKey,
          FilterExpression: filterExp ? filterExp.expression : undefined,
          ExpressionAttributeNames: filterExp ? filterExp.names : undefined,
          ExpressionAttributeValues: filterExp ? filterExp.values : undefined,
        })
      );

      // if a scan has only 1 page, then it will not have a LastEvaluatedKey
      if (!startKey && page > 1) {
        return {
          ...response,
          columns: [],
          ScannedCount: 0,
        };
      }

      // get all the column names from the page
      const cols =
        response.ScannedCount !== 0
          ? new Set(response.Items.flatMap((i) => Object.keys(i)))
          : new Set();

      // remove the PK and SK from the column names
      cols.delete(Pk);
      cols.delete(Sk);

      // append the PK and SK in the front of the columns
      return {
        ...response,
        columns: [Pk, Sk, ...Array.from(cols)],
      };
    },
    enabled: false,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// TODO: make it follow same pattern as above
export function queryTable(
  tableName: string,
  Pk?: string,
  Pv?: any,
  Sk?: string,
  Sv?: any,
  index?: string,
  page?: any
) {
  const dynamo = useClient(DynamoDBClient);
  return useQuery<ScanItem>({
    queryKey: ["queryTable"],
    queryFn: async () => {
      let keyConditionExpression = `#Pk = :val`;
      const expressionAttributeNames: any = {
        "#Pk": Pk,
      };
      const expressionAttributeValues: any = {
        ":val": dataToItem({
          ":val": Pv,
        })[":val"],
      };

      if (Sk && Sv) {
        keyConditionExpression += ` AND #Sk = :val2`;
        expressionAttributeNames["#Sk"] = Sk;
        expressionAttributeValues[":val2"] = dataToItem({
          ":val2": Sv,
        })[":val2"];
      }

      const response = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          Limit: 10,
          // ExclusiveStartKey: page,
          IndexName: index === "primary" ? undefined : index.slice(4),
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );

      console.log(response);
      const cols =
        response.ScannedCount !== 0
          ? new Set(response.Items.flatMap((i) => Object.keys(i)))
          : new Set();
      cols.delete(Pk);
      cols.delete(Sk);

      return {
        ...response,
        columns: [Pk, Sk, ...Array.from(cols)],
      };
    },
    enabled: false,
  });
}

export function createItem() {
  const dynamo = useClient(DynamoDBClient);
  return useMutation({
    mutationFn: async (opts: { tableName: string; item: any }) => {
      const response = await dynamo.send(
        new PutItemCommand({
          TableName: opts.tableName,
          Item: opts.item,
        })
      );
      return response;
    },
  });
}

export function getItem() {
  const dynamo = useClient(DynamoDBClient);
  return useMutation({
    mutationFn: async (opts: { tableName: string; Pk: any }) => {
      const response = await dynamo.send(
        new GetItemCommand({
          TableName: opts.tableName,
          Key: opts.Pk,
        })
      );
      return response;
    },
  });
}

export function updateItem() {
  const dynamo = useClient(DynamoDBClient);
  return useMutation({
    mutationFn: async (opts: { tableName: string; item: any; delta: any }) => {
      const params = deltaToUpdateParams(opts.delta);
      const response = await dynamo.send(
        new UpdateItemCommand({
          TableName: opts.tableName,
          Key: dataToItem(opts.item),
          ExpressionAttributeNames: params.ExpressionAttributeNames!,
          ExpressionAttributeValues:
            Object.keys(params.ExpressionAttributeValues).length === 0
              ? undefined
              : (params.ExpressionAttributeValues as any),
          UpdateExpression: params.UpdateExpression,
        })
      );
      return response;
    },
  });
}

export function deleteItem() {
  const dynamo = useClient(DynamoDBClient);
  return useMutation({
    mutationFn: async (opts: { tableName: string; item: any }) => {
      const response = await dynamo.send(
        new DeleteItemCommand({
          TableName: opts.tableName,
          Key: dataToItem(opts.item),
        })
      );
      return response;
    },
  });
}
