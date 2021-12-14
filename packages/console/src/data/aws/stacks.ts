import { useQuery, useQueryClient } from "react-query";
import CloudFormation from "aws-sdk/clients/cloudformation";
import { zipWith } from "remeda";
import { useParams } from "react-router-dom";

const credentials = {
  accessKeyId: "ASIA5MNJ2I3TGBQQRDMO",
  secretAccessKey: "p2aiiUlZfhMf5wRj/h3CfUybcF0kmxXTn1spsTtr",
  sessionToken:
    "IQoJb3JpZ2luX2VjEHcaCXVzLWVhc3QtMiJHMEUCIQCtzeJJIV5WRbq7XSjO/ENWWBrnU3ns7XivCCOZJRUgnwIgBx9ArNufAzE0rYBF1olNV4lLEJtWYLjG9b3HKSXgUFUqngIIYBAAGgw5MjAwMTYwMTMwMzAiDEK89+eEHBjQG9P0GSr7AcKhtv7YUGKRMg+453vpnFKZypjbT3r7HsTqHAFu9+q8UoWVrHlgNb64T62GWrjR9D7a3CyIvfhFQkApOAp+qQkpu/m4FaXbgsmiPUEjvuV7IWC48bR93WmqOgRfeFyhYUaafgSsbAzC/ZeHF3E96tOjN8sq+ZO+HuL8G3dqTo2xM1OL/PmaeXv196PvEarpSSJwCTg2Sno9I/gK+Jg4ucEMVu15qdfxp8zjY7Ft8m6vns1ATqDflymiKCTcPUTzXENbbeK9LY4ryL0HYO36mi/OKvY//JLh676GbcBrLJC/4rs+00tX6/iAbdwnswBm6awGGGjtNWMyQfLFMPTY4o0GOp0BugvdX3zhp03eVTAmSmdS+DETUXPzxpu6doJulJxSwLDlyssIFWRuxM/NMsPSQbcHBg5VJ6K+CBkcRKgBUUWQaefk4LXZqvpY09GCwzuNRolk1JtwpwK+FzCH/3uWFSkpOZrIMb0TNws9dN0kuCuyyOobDY9KCD+uZ2xSyn6/4/usl4m6ULMKnroxCuCNgPiImvsllIASm8ICfVZrFQ==",
};

const cf = new CloudFormation({
  region: "us-east-2",
  credentials,
  maxRetries: 0,
});

type Stack = {
  info: CloudFormation.Stack;
  metadata: {
    version: string;
    constructs: Construct[];
  };
};

type FunctionConstruct = {
  functionArn: string;
  name: string;
  type: "Function";
};

type Construct = FunctionConstruct;

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
