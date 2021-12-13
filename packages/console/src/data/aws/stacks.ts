import { useQuery, useQueryClient } from "react-query";
import CloudFormation from "aws-sdk/clients/cloudformation";
import { zipWith } from "remeda";
import { useParams } from "react-router-dom";

const cf = new CloudFormation({
  region: "us-east-2",
  credentials: {
    sessionToken:
      "IQoJb3JpZ2luX2VjEEoaCXVzLWVhc3QtMiJHMEUCIB/T/H3+AOGtOuEO/GRFYmypQ5Jq3z4T5x33N32XVAbGAiEA5FZxZslLAkfViPW/9miYBVVFD7D3hJ+lpTjvOjMWrA8qkgIIMxAAGgwyODA4MjY3NTMxNDEiDBfWkvZMzg/ZbKQC5SrvARB3UMDibC3oSyNx/eOqOXr1IiRKd/BvQmy+CJzyozeflKZ13m/IjOyQvoIkPXWfRHsf8Io+jFImEN8U0x/gRfCsGbOtjdWf1/N2cD/lz0xeLsDZZ9VTitegBsjLyN8Yi5P2xovgaFV/wnhpfVDq6Yg/n0hqVM1809MgwPN2kc0ki0OASam90b2Dspke24v3wuPHBYD8cF9TrcWkT/3kjYHXaIIxQdbW7ypQte2EhD02izrHfisaCHs9foniDzEc8bKphmQFlD2kRnBMav72xwXkvIcgE1t7LVoEdI9ytUye+wQVpYGApUtHulKJMt+cMOj12I0GOp0BeNiUuI2CCEvqSKPKosboyQBuVHyR8FLUakWGnetuEzpNIYe9M29jf5itlp316t6+wcLQX2245VeMGIBAFBTvuTjixQbH6/40sA95y70fn41CiBjveLvvBpS12ke6UepzmKZ9K5UYMb5BJu33vyRE3MRsH1sbDOgr8HY71/H50dH8gShGomGmfo8k0vyLTMs8dnSMdiLUCLSrhBlt4Q==",
    accessKeyId: "ASIAUCYUUGB2TL6M7SOH",
    secretAccessKey: "EBk97mu1bjmoZXIU4EwV3FevR+Vbyb7CBwubgiYR",
  },
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
