import { useQuery } from "react-query";
import {
  CloudFormationClient,
  Stack,
  Tag,
  DescribeStacksCommand,
  DescribeStackResourceCommand,
} from "@aws-sdk/client-cloudformation";
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

export type StackInfo = {
  info: Stack;
  constructs: {
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
  return useQuery(
    ["stacks", params.app!, params.stage!],
    async () => {
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
      const response = await cf.send(new DescribeStacksCommand({}));
      if (!response.Stacks) throw Error("No stacks found");
      const filtered = response.Stacks.filter((stack) =>
        requireTags(stack.Tags, tagFilter)
      );

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
          /*
            all: pipe(
              constructs,
              groupBy((x) => x.type),
              mapValues((value) => fromPairs(value.map((x) => [x.addr, x])))
            ),
            */
          all: constructs,
          byAddr: fromPairs(constructs.map((x) => [x.addr, x])),
          byType: groupBy(constructs, (x) => x.type),
        };
        return result;
      });

      // Limit to 3 at a time to avoid hitting AWS limits
      const meta: Awaited<ReturnType<typeof work[number]>>[] = [];
      while (work.length) {
        meta.push(...(await Promise.all(work.splice(0, 3).map((f) => f()))));
      }

      const stacks = zipWith(
        filtered,
        meta,
        (s, c): StackInfo => ({
          constructs: c,
          info: s,
        })
      );

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
                case "Api":
                case "WebSocketApi":
                case "ApiGatewayV1Api":
                  return construct.data.routes
                    .filter((r) => r.fn)
                    .map((r) => [r.fn!.node, construct]);
                case "AppSync":
                  return construct.data.dataSources
                    .filter((r) => r.fn)
                    .map((r) => [r.fn!.node, construct]);
                case "Auth":
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
  return stacks.data?.constructs.byType[type] || [];
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
