import {
  GetParametersByPathCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import { mapKeys, pipe, mapValues } from "remeda";
import { useProject } from "./app";
import { useAWSClient } from "./credentials";
import { useFunctions } from "./stacks/metadata";

interface Secret {
  value?: string;
  fallback?: string;
}

export namespace Config {
  export async function parameters() {
    const result: Record<string, string> = {};

    for await (const p of scan(PREFIXES.PARAMETERS.VALUES)) {
      const { name } = parse(p.Name!);
      result[name] = p.Value!;
    }

    return result;
  }

  export async function secrets() {
    const result: Record<string, Secret> = {};

    for await (const p of scan(PREFIXES.SECRETS.VALUES)) {
      const { name } = parse(p.Name!);
      if (!result[name]) result[name] = {};
      result[name].value = p.Value;
    }

    for await (const p of scan(PREFIXES.SECRETS.FALLBACK)) {
      const { name } = parse(p.Name!);
      if (!result[name]) result[name] = {};
      result[name].fallback = p.Value;
    }

    return result;
  }

  export async function env() {
    const project = useProject();

    const [secrets, parameters] = await Promise.all([
      Config.secrets(),
      Config.parameters(),
    ]);

    const env = {
      SST_APP: project.name,
      SST_STAGE: project.stage,
      ...pipe(
        secrets,
        mapKeys((k) => `${PREFIXES.PARAMETERS.ENV}${k}`),
        mapValues((v) => v.value || v.fallback)
      ),
      ...pipe(
        parameters,
        mapKeys((k) => `${PREFIXES.PARAMETERS.ENV}${k}`)
      ),
    };

    return env as typeof env & Record<string, string | undefined>;
  }

  export async function setSecret(key: string, value: string) {
    const ssm = useAWSClient(SSMClient);

    await ssm.send(
      new PutParameterCommand({
        Name: `${PREFIXES.SECRETS.VALUES}${key}`,
        Value: value,
        Type: "SecureString",
        Overwrite: true,
      })
    );
  }

  export async function restart(key: string) {
    const lambda = useAWSClient(LambdaClient);
    const functions = await useFunctions();
    const filtered = Object.values(functions).filter((f) =>
      f.data.secrets.includes(key)
    );

    await Promise.all(
      filtered.map(async (f) => {
        const config = await lambda.send(
          new GetFunctionConfigurationCommand({
            FunctionName: f.data.arn,
          })
        );

        await lambda.send(
          new UpdateFunctionConfigurationCommand({
            FunctionName: f.data.arn,
            Environment: {
              Variables: {
                ...(config.Environment?.Variables || {}),
                [SECRET_UPDATED_AT_ENV]: Date.now().toString(),
              },
            },
          })
        );
      })
    );
    return filtered.length;
  }
}

async function* scan(prefix: string) {
  const ssm = useAWSClient(SSMClient);
  let token = undefined;

  while (true) {
    const results = await ssm.send(
      new GetParametersByPathCommand({
        Path: prefix,
        WithDecryption: true,
        Recursive: true,
        NextToken: token,
      })
    );
    yield* results.Parameters || [];

    if (!results.NextToken) break;
  }
}

const FALLBACK_STAGE = ".fallback";
const SECRET_UPDATED_AT_ENV = "SST_ADMIN_SECRET_UPDATED_AT";

const PREFIXES = {
  SECRETS: {
    get VALUES() {
      const project = useProject();
      return `/sst/${project.name}/${project.stage}/secrets/`;
    },
    get FALLBACK() {
      const project = useProject();
      return `/sst/${project.name}/${FALLBACK_STAGE}/secrets/`;
    },
    ENV: "SST_SECRET_",
  },
  PARAMETERS: {
    get VALUES() {
      const project = useProject();
      return `/sst/${project.name}/${project.stage}/parameters/`;
    },
    ENV: "SST_PARAM_",
  },
};

function parse(ssmName: string) {
  const parts = ssmName.split("/");
  return {
    app: parts[2],
    stage: parts[3],
    type: parts[4],
    name: parts.slice(5).join("/"),
  };
}
