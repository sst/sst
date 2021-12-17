import { useQuery } from "react-query";
import CloudFormation from "aws-sdk/clients/cloudformation";
import {
  flatMap,
  fromPairs,
  groupBy,
  map,
  mapValues,
  pipe,
  toPairs,
  zipWith,
} from "remeda";
import { useParams } from "react-router-dom";
import type { Metadata } from "../../../../resources/src/Metadata";
import { useService } from "./service";

export type StackInfo = {
  info: CloudFormation.Stack;
  constructs: {
    all: Metadata[];
    byAddr: Record<string, Metadata>;
    byType: { [key in Metadata["type"]]?: Extract<Metadata, { type: key }>[] };
  };
};

type Result = {
  all: StackInfo[];
  byName: Record<string, StackInfo>;
  constructs: {
    byType: {
      [key in Metadata["type"]]?: {
        stack: StackInfo;
        info: Extract<Metadata, { type: key }>;
      }[];
    };
  };
};

export function useStacks() {
  const params = useParams<{ app: string; stage: string }>();
  const cf = useService(CloudFormation);
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
      const response = await cf.describeStacks().promise();
      if (!response.Stacks) throw Error("No stacks found");
      const filtered = response.Stacks.filter((stack) =>
        requireTags(stack.Tags, tagFilter)
      );

      const meta = await Promise.all(
        filtered.map(async (x) => {
          const response = await cf
            .describeStackResource({
              StackName: x.StackName,
              LogicalResourceId: "SSTMetadata",
            })
            .promise();
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
        })
      );

      const stacks = zipWith(
        filtered,
        meta,
        (s, c): StackInfo => ({
          constructs: c,
          info: s,
        })
      );

      const result: Result = {
        all: stacks,
        byName: fromPairs(stacks.map((x) => [x.info.StackName, x])),
        constructs: {
          byType: pipe(
            stacks,
            map((stack) =>
              mapValues(stack.constructs.byType, (list) =>
                list!.map((c) => ({ stack, info: c }))
              )
            ),
            flatMap((x) => toPairs(x)),
            fromPairs
          ),
        },
      };
      return result;
    },
    {
      retry: false,
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

function requireTags(
  input: CloudFormation.Tags | undefined,
  toFind: CloudFormation.Tags
) {
  if (!input) return false;
  return (
    input.filter((t) =>
      toFind.some((x) => x.Key === t.Key && x.Value === t.Value)
    ).length === toFind.length
  );
}
