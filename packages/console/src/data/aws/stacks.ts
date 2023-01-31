import { useQuery } from "react-query";
import {
  CloudFormationClient,
  Stack,
  Tag,
  DescribeStacksCommand,
  DescribeStackResourceCommand,
} from "@aws-sdk/client-cloudformation";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
  flatMap,
  fromPairs,
  groupBy,
  map,
  mapValues,
  pipe,
  uniqBy,
  values,
  zipWith,
} from "remeda";
import { useParams } from "react-router-dom";
import type { Metadata } from "../../../../resources/src/Metadata";
import { useClient } from "./client";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

export type StackInfo = {
  info: Stack;
  constructs: {
    version?: string;
    all: Metadata[];
    byAddr: Record<string, Metadata>;
    byType: { [key in Metadata["type"]]?: Extract<Metadata, { type: key }>[] };
  };
};

type Result = {
  app: string;
  stage: string;
  all: StackInfo[];
  byName: Record<string, StackInfo>;
  constructs: {
    integrations: Record<string, Metadata[]>;
    byType: {
      [key in Metadata["type"]]?: Extract<Metadata, { type: key }>[];
    };
  };
};

export function useStacks() {
  const params = useParams<{ app: string; stage: string }>();
  const cf = useClient(CloudFormationClient);
  const s3 = useClient(S3Client);
  const ssm = useClient(SSMClient);

  return useQuery(
    ["stacks", params.app!, params.stage!],
    async () => {
      let stacks: StackInfo[] = [];

      try {
        async function getMetadataBucket() {
          // Lookup from SSM first (SST v1)
          try {
            const value = await ssm.send(
              new GetParameterCommand({
                Name: `/sst/bootstrap/bucket-name`,
              })
            );
            return value.Parameter.Value;
          } catch (e: any) {
            if (e.name === "ParameterNotFound") {
              // Lookup from Bootstrap stack output (SST v2)
              const describe = await cf.send(
                new DescribeStacksCommand({
                  StackName: "SSTBootstrap",
                })
              );
              const output = (describe.Stacks![0].Outputs || []).find(
                (o) => o.OutputKey === "BucketName"
              );
              return output.OutputValue;
            }
            throw e;
          }
        }
        const bucketName = await getMetadataBucket();
        const list = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: `stackMetadata/app.${params.app}/stage.${params.stage}/`,
          })
        );
        stacks = await Promise.all(
          list.Contents?.map(async (item) => {
            while (true) {
              try {
                const result = await s3.send(
                  new GetObjectCommand({
                    Bucket: bucketName,
                    Key: item.Key,
                  })
                );
                const stackName = item.Key.split(".").at(-2);
                const resp = new Response(result.Body as ReadableStream);
                const constructs = ((await resp.json()) || []) as Metadata[];
                // Get the stack info. Note that if stack is not found in CloudFormation,
                // supress the error.
                let describe;
                try {
                  describe = await cf.send(
                    new DescribeStacksCommand({
                      StackName: stackName,
                    })
                  );
                } catch (e: any) {
                  if (
                    e.name === "ValidationError" &&
                    e.message.includes("does not exist")
                  ) {
                    return null;
                  }
                }
                const info: StackInfo = {
                  info: describe.Stacks[0],
                  constructs: {
                    all: constructs,
                    byAddr: fromPairs(constructs.map((x) => [x.addr, x])),
                    byType: groupBy(constructs, (x) => x.type),
                  },
                };
                return info;
              } catch {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          }) || []
        );
        // Filter stacks that are not found in CloudFormation.
        stacks = stacks.filter((x) => x !== null);
      } catch (ex) {
        console.error(ex);
        console.warn(
          "Failed to get metadata from S3. Falling back to old method, please update SST",
          ex
        );
        const tagFilter = [
          {
            Key: "sst:app",
            Value: params.app!,
          },
          {
            Key: "sst:stage",
            Value: params.stage!,
          },
        ];

        async function describeStacks(token?: string): Promise<Stack[]> {
          const response = await cf.send(
            new DescribeStacksCommand({
              NextToken: token,
            })
          );
          if (!response.Stacks) return [];
          const filtered = response.Stacks.filter((stack) =>
            requireTags(stack.Tags, tagFilter)
          );
          if (!response.NextToken) return filtered;
          return [...filtered, ...(await describeStacks(response.NextToken))];
        }

        const filtered = await describeStacks();
        const work = filtered.map((x) => async () => {
          const response = await cf.send(
            new DescribeStackResourceCommand({
              StackName: x.StackName,
              LogicalResourceId: "SSTMetadata",
            })
          );
          const parsed = JSON.parse(response.StackResourceDetail!.Metadata!);
          const constructs = parsed["sst:constructs"] as Metadata[];
          const result: StackInfo["constructs"] = {
            version: parsed["sst:version"],
            all: constructs,
            byAddr: fromPairs(constructs.map((x) => [x.addr, x])),
            byType: groupBy(constructs, (x) => x.type),
          };
          return result;
        });

        // Limit to 3 at a time to avoid hitting AWS limits
        const meta: Awaited<ReturnType<(typeof work)[number]>>[] = [];
        while (work.length) {
          meta.push(...(await Promise.all(work.splice(0, 3).map((f) => f()))));
        }

        stacks = zipWith(
          filtered,
          meta,
          (s, c): StackInfo => ({
            constructs: c,
            info: s,
          })
        ).filter(
          (x) =>
            x.constructs.version.startsWith("0.0.0") ||
            x.constructs.version >= "0.56.0"
        );
      }

      const result: Result = {
        app: params.app!,
        stage: params.stage!,
        all: stacks,
        byName: fromPairs(stacks.map((x) => [x.info.StackName!, x])),
        constructs: {
          integrations: pipe(
            stacks,
            flatMap((x) => x.constructs.all),
            flatMap((construct): [string, Metadata][] => {
              // TODO: Not sure why data is ever undefined but Phil Astle reported it
              if (!construct.data) return [];
              switch (construct.type) {
                case "WebSocketApi":
                case "ApiGatewayV1Api":
                  return construct.data.routes
                    .filter((r) => r.fn)
                    .map((r) => [r.fn!.node, construct]);
                case "Api":
                  return construct.data.routes
                    .filter((r) => r.fn)
                    .map((r) => [r.fn!.node, construct]);
                case "AppSync":
                  return construct.data.dataSources
                    .filter((r) => r.fn)
                    .map((r) => [r.fn!.node, construct]);
                case "Cognito":
                  return construct.data.triggers
                    .filter((r) => r.fn)
                    .map((r) => [r.fn!.node, construct]);
                case "Bucket":
                  return construct.data.notifications
                    .filter((fn) => fn)
                    .map((fn) => [fn!.node, construct]);
                case "Cron":
                  if (!construct.data.job) return [];
                  return [[construct.data.job.node, construct]];
                case "EventBus":
                  return construct.data.rules.flatMap((r) =>
                    r.targets.map(
                      (fn) => [fn!.node, construct] as [string, Metadata]
                    )
                  );
                case "KinesisStream":
                  return construct.data.consumers
                    .filter((c) => c.fn)
                    .map((c) => [c.fn!.node, construct]);
                case "Queue":
                  if (!construct.data.consumer) return [];
                  return [[construct.data.consumer.node, construct]];
                case "Table":
                  return construct.data.consumers.map((c) => [
                    c.fn!.node,
                    construct,
                  ]);
                case "Topic":
                  return construct.data.subscribers.map((fn) => [
                    fn!.node,
                    construct,
                  ]);
                default:
                  return [];
              }
            }),
            groupBy((x) => x[0]),
            mapValues((x) => x.map((tuple) => tuple[1])),
            mapValues((list) => uniqBy(list, (m) => m.addr))
          ),
          byType: pipe(
            stacks,
            map((stack) => pipe(stack.constructs.byAddr, values)),
            flatMap((x) => x),
            groupBy((x) => x.type)
          ),
        },
      };
      console.log("Processed metadata", result);
      return result;
    },
    {
      retry: true,
      staleTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    }
  );
}

export function useStackFromName(name: string) {
  const stacks = useStacks();
  return stacks.data?.byName[name];
}

export function useConstructsByType<T extends Metadata["type"]>(type: T) {
  const stacks = useStacks();
  const result = stacks.data?.constructs.byType[type];
  return result || ([] as typeof result);
}

export function useConstruct<T extends Metadata["type"]>(
  _type: T,
  stack: string,
  addr: string
) {
  const s = useStackFromName(stack);
  const x = s?.constructs.byAddr?.[addr] as Extract<Metadata, { type: T }>;
  return x!;
}

function requireTags(input: Tag[] | undefined, toFind: Tag[]) {
  if (!input) return false;
  return (
    input.filter((t) =>
      toFind.some((x) => x.Key === t.Key && x.Value === t.Value)
    ).length === toFind.length
  );
}
