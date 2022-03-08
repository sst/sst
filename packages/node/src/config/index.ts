import SSM, { ParameterList } from "aws-sdk/clients/ssm.js";

const ssm = new SSM();

async function wildcard(
  prefix: string,
  token?: string
): Promise<ParameterList> {
  const result = await ssm
    .getParametersByPath({
      WithDecryption: true,
      Recursive: true,
      Path: prefix,
      NextToken: token,
    })
    .promise();
  const parameters = result.Parameters || [];
  return [
    ...parameters,
    ...(result.NextToken ? await wildcard(prefix, result.NextToken) : []),
  ];
}

async function load() {
  const splits = process.env.SSM_VALUES!.split(",");

  const work: Promise<ParameterList>[] = [];
  while (splits.length) {
    const chunk = splits.splice(0, 10);
    work.push(
      (async () => {
        const result = await ssm
          .getParameters({
            Names: chunk.map((v) => `${process.env.SSM_PREFIX!}${v}`),
            WithDecryption: true,
          })
          .promise();
        const params = result.Parameters || [];
        if (result.InvalidParameters?.length) {
          if (!process.env.SSM_FALLBACK)
            throw new Error(
              "Missing parameters and no fallback specified: " +
                result.InvalidParameters.join(", ")
            );

          const fallback = await ssm
            .getParameters({
              Names: (result.InvalidParameters || []).map((item) =>
                item.replace(process.env.SSM_PREFIX!, process.env.SSM_FALLBACK!)
              ),
              WithDecryption: true,
            })
            .promise();
          if (fallback.InvalidParameters?.length)
            throw new Error(
              "Missing parameters after searching fallback: " +
                fallback.InvalidParameters.join(", ")
            );
          params.push(...(fallback.Parameters || []));
        }
        return params;
      })()
    );
  }
  const all = await Promise.all(work);
  return all.flat();
}

if (!process.env.SSM_PREFIX) throw new Error("SSM_PREFIX is not set");

export const Config: Record<string, string> = {};

const params =
  process.env.SSM_VALUES === "*"
    ? [
        ...(await wildcard(process.env.SSM_PREFIX!)),
        ...(process.env.SSM_FALLBACK
          ? await wildcard(process.env.SSM_FALLBACK)
          : []),
      ]
    : await load();

for (const item of params || []) {
  const last = item.Name!.split("/").pop()!;
  Config[last] = process.env[last] || item.Value!;
}

export function config(key: string) {
  const value = Config[key];
  if (!value) throw new Error(`Missing parameter "${key}"`);
  return value;
}
