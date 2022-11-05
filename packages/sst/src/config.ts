import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  SSMClient
} from "@aws-sdk/client-ssm";
import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand
} from "@aws-sdk/client-lambda";
import { pipe, map } from "remeda";
import { useProject } from "./app.js";
import { useAWSClient } from "./credentials.js";
import { useFunctions } from "./stacks/metadata.js";

interface Secret {
  value?: string;
  fallback?: string;
}

export namespace Config {
  export async function parameters() {
    const result: (ReturnType<typeof parse> & { value: string })[] = [];

    for await (const p of scan(PREFIXES.PARAMETERS.VALUES)) {
      const parsed = parse(p.Name!);
      if (parsed.type === "secrets") continue;
      result.push({
        ...parsed,
        value: p.Value!
      });
    }

    return result;
  }

  export function pathFor(input: { type: string; id: string; name: string }) {
    return `${input.type}/${input.id}/${input.name}`;
  }

  export async function secrets() {
    const result: Record<string, Secret> = {};

    for await (const p of scan(PREFIXES.PARAMETERS.VALUES + "Secret")) {
      const parsed = parse(p.Name!);
      if (!result[parsed.id]) result[parsed.id] = {};
      result[parsed.id].value = p.Value;
    }

    for await (const p of scan(PREFIXES.PARAMETERS.FALLBACK + "Secret")) {
      const parsed = parse(p.Name!);
      if (!result[parsed.id]) result[parsed.id] = {};
      result[parsed.id].fallback = p.Value;
    }

    return result;
  }

  export async function env() {
    const project = useProject();

    const parameters = await Config.parameters();

    const env = {
      SST_APP: project.name,
      SST_STAGE: project.stage,
      ...pipe(
        parameters,
        map(p => [`SST_${p.type}_${p.name}_${p.id}`, p.value]),
        Object.fromEntries
      )
    };

    return env as typeof env & Record<string, string | undefined>;
  }

  export async function setSecret(input: {
    key: string;
    value: string;
    fallback?: boolean;
  }) {
    const ssm = useAWSClient(SSMClient);
    const result = await ssm.send(
      new PutParameterCommand({
        Name: `${
          input.fallback
            ? PREFIXES.PARAMETERS.FALLBACK
            : PREFIXES.PARAMETERS.VALUES
        }${pathFor({
          id: input.key,
          type: "Secret",
          name: "value"
        })}`,
        Value: input.value,
        Type: "SecureString",
        Overwrite: true
      })
    );
  }

  export async function getSecret(input: { key: string; fallback?: boolean }) {
    const ssm = useAWSClient(SSMClient);
    const result = await ssm.send(
      new GetParameterCommand({
        Name: `${
          input.fallback
            ? PREFIXES.PARAMETERS.FALLBACK
            : PREFIXES.PARAMETERS.VALUES
        }${pathFor({
          id: input.key,
          name: "value",
          type: "Secret"
        })}`,
        WithDecryption: true
      })
    );
    return result.Parameter?.Value;
  }

  export async function removeSecret(input: {
    key: string;
    fallback?: boolean;
  }) {
    const ssm = useAWSClient(SSMClient);
    await ssm.send(
      new DeleteParameterCommand({
        Name: `${
          input.fallback
            ? PREFIXES.PARAMETERS.FALLBACK
            : PREFIXES.PARAMETERS.VALUES
        }${pathFor({
          id: input.key,
          type: "Secret",
          name: "value"
        })}`
      })
    );
  }

  export async function restart(key: string) {
    const lambda = useAWSClient(LambdaClient);
    const functions = await useFunctions();
    const filtered = Object.values(functions).filter(f =>
      f.data.secrets.includes(key)
    );

    await Promise.all(
      filtered.map(async f => {
        const config = await lambda.send(
          new GetFunctionConfigurationCommand({
            FunctionName: f.data.arn
          })
        );

        await lambda.send(
          new UpdateFunctionConfigurationCommand({
            FunctionName: f.data.arn,
            Environment: {
              Variables: {
                ...(config.Environment?.Variables || {}),
                [SECRET_UPDATED_AT_ENV]: Date.now().toString()
              }
            }
          })
        );
      })
    );
    return filtered.length;
  }
  export const PREFIXES = {
    PARAMETERS: {
      get VALUES() {
        const project = useProject();
        return `/sst/${project.name}/${project.stage}/`;
      },
      get FALLBACK() {
        const project = useProject();
        return `/sst/${project.name}/${FALLBACK_STAGE}/`;
      }
    }
  };
}

async function* scan(prefix: string) {
  const ssm = useAWSClient(SSMClient);
  let token: string | undefined;

  while (true) {
    const results = await ssm.send(
      new GetParametersByPathCommand({
        Path: prefix,
        WithDecryption: true,
        Recursive: true,
        NextToken: token
      })
    );
    yield* results.Parameters || [];

    if (!results.NextToken) break;
    token = results.NextToken;
  }
}

const FALLBACK_STAGE = ".fallback";
const SECRET_UPDATED_AT_ENV = "SST_ADMIN_SECRET_UPDATED_AT";

function parse(ssmName: string) {
  const parts = ssmName.split("/");
  return {
    type: parts[4],
    id: parts[5],
    name: parts.slice(6)
  };
}
