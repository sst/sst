import { useQuery, useQueryClient } from "react-query";
import CloudFormation from "aws-sdk/clients/cloudformation";
import { zipWith } from "remeda";
import { useParams } from "react-router-dom";

const cf = new CloudFormation({
  region: "us-east-2",
  credentials: {
    sessionToken:
      "IQoJb3JpZ2luX2VjEGAaCXVzLWVhc3QtMiJHMEUCIQDIhizg2/Xvomrby3wBNUYN/+IO51iakMYkhJrQuFUTbQIgFAdGitqPZW8uwBbw8EPKuQb6VUU9UrPhladhGOwy2akqngIISRAAGgw5MjAwMTYwMTMwMzAiDMKldqEgm3z1kZvKMCr7AXR+rixAeHFB1BhYKpsj6Mr+6BV6z7F1TO0sIkDYClTzlSE7tlZIkjwQrIcdRAPWUyUfJzlAF6kCRdMTaZR3WBvc3kxFp4gdONxqS+Ra8xBIQYVwkGhw34ZCDVup5pNw23y5g5V1S1rv/FlNpq4cCO8eL31YsxAtK2ewRGA5OaQeyp22ZS+XUrRI6WYG/unOC+eXsR66Kw8XgAqIsahGT8rScxM+jUSTgVRWm1TU2BMVWRXmQZYC/2TaSzW5RP5W4SmQ1rgn3VhhUWUWbY216+gHNeS5lm2wuqV8hmzCoZpp0ifZhEvgCCah51amM+td2KaZs/Kcv7Lnuu7SML/U3Y0GOp0BsxmUxOtUsxMiP20wGirNKUo/luby06c0l4MnMK82hQoEA6Epv9tLyWFeHR6BFC100Tx0g3zgnJX5r1KfNydimGIWWHoKpJlHE3onxE0j25jGid5qPJjWDC464R/GhheVYuyGSfwLdp6Z3A9wp7bqG0U9TZxkuzRlmfcaFOhGt67AHcSfDBej3RcYjJSAF1dxgnLHFbj6v9EordFtrA==",
    accessKeyId: "ASIA5MNJ2I3TLK3D6Y5T",
    secretAccessKey: "dN60E4Cewx1ESUpebaE5OsrH5vvACxgXyGI//7oc",
  },
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
