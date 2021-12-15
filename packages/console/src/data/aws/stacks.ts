import { useQuery, useQueryClient } from "react-query";
import CloudFormation from "aws-sdk/clients/cloudformation";
import { zipWith } from "remeda";
import { useParams } from "react-router-dom";
import { AWS_CREDENTIALS } from "./credentials";
import type { All } from "../../../../resources/dist/Metadata";

const cf = new CloudFormation({
  region: "us-east-2",
  credentials: AWS_CREDENTIALS,
  maxRetries: 0,
});

type Stack = {
  info: CloudFormation.Stack;
  metadata: {
    version: string;
    constructs: All[];
  };
};

export function useStacksQuery() {
  const params = useParams<{ app: string; stage: string }>();
  return useQuery(
    ["stacks", params.app!, params.stage!],
    async () => {
      console.log("Running");
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
      const stacks =
        response.Stacks?.filter((stack) =>
          requireTags(stack.Tags, tagFilter)
        ) || [];

      const metadatas = await Promise.all(
        stacks.map(async (x) => {
          const response = await cf
            .describeStackResource({
              StackName: x.StackName,
              LogicalResourceId: "SSTMetadata",
            })
            .promise();
          const parsed = JSON.parse(response.StackResourceDetail!.Metadata!);
          const result: Stack["metadata"] = {
            constructs: parsed["sst:constructs"],
            version: parsed["sst:version"],
          };
          return result;
        })
      );
      return zipWith(
        stacks,
        metadatas,
        (s, m): Stack => ({
          metadata: m,
          info: s,
        })
      );
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
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

export function useStacks() {
  const params = useParams<{ app: string; stage: string }>();
  const client = useQueryClient();
  const result = client
    .getQueryCache()
    .find<unknown, unknown, Stack[]>(["stacks", params.app!, params.stage!]);

  return result!.state.data!;
}
