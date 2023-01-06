import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import { pipe, map } from "remeda";
import { useProject } from "./project.js";
import { useAWSClient } from "./credentials.js";
import { Stacks } from "./stacks/index.js";
import { FunctionMetadata } from "./constructs/Metadata.js";

interface Secret {
  value?: string;
  fallback?: string;
}

export namespace Config {
  export async function parameters() {
    const result: (ReturnType<typeof parse> & { value: string })[] = [];

    for await (const p of scan(PREFIX.FALLBACK)) {
      const parsed = parse(p.Name!);
      if (parsed.type === "secrets") continue;
      result.push({
        ...parsed,
        value: p.Value!,
      });
    }

    for await (const p of scan(PREFIX.STAGE)) {
      const parsed = parse(p.Name!);
      if (parsed.type === "secrets") continue;
      result.push({
        ...parsed,
        value: p.Value!,
      });
    }

    return result;
  }

  export function envFor(input: {
    type: string;
    id: string;
    prop: string;
    fallback?: boolean;
  }) {
    return `SST_${input.type}_${input.prop}_${input.id}`;
  }

  export function pathFor(input: {
    type: string;
    id: string;
    prop: string;
    fallback?: boolean;
  }) {
    return `${input.fallback ? PREFIX.FALLBACK : PREFIX.STAGE}${
      input.type
    }/${normalizeID(input.id)}/${input.prop}`;
  }

  export function normalizeID(input: string) {
    return input.replace(/-/g, "_");
  }

  export async function secrets() {
    const result: Record<string, Secret> = {};

    for await (const p of scan(PREFIX.STAGE + "Secret")) {
      const parsed = parse(p.Name!);
      if (!result[parsed.id]) result[parsed.id] = {};
      result[parsed.id].value = p.Value;
    }

    for await (const p of scan(PREFIX.FALLBACK + "Secret")) {
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
      SST_APP: project.config.name,
      SST_STAGE: project.config.stage,
      ...pipe(
        parameters,
        map((p) => [`SST_${p.type}_${p.prop}_${p.id}`, p.value]),
        Object.fromEntries
      ),
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
        Name: pathFor({
          id: input.key,
          type: "Secret",
          prop: "value",
          fallback: input.fallback,
        }),
        Value: input.value,
        Type: "SecureString",
        Overwrite: true,
      })
    );
  }

  export async function getSecret(input: { key: string; fallback?: boolean }) {
    const ssm = useAWSClient(SSMClient);
    const result = await ssm.send(
      new GetParameterCommand({
        Name: pathFor({
          id: input.key,
          prop: "value",
          type: "Secret",
          fallback: input.fallback,
        }),
        WithDecryption: true,
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
        Name: pathFor({
          id: input.key,
          type: "Secret",
          prop: "value",
          fallback: input.fallback,
        }),
      })
    );
  }

  export async function restart(key: string) {
    const lambda = useAWSClient(LambdaClient);
    const metadata = await Stacks.metadata();
    const filtered = Object.values(metadata)
      .flat()
      .filter((f): f is FunctionMetadata => f.type === "Function")
      .filter((f) => f.data.secrets.includes(key));

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
  let token: string | undefined;

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
    token = results.NextToken;
  }
}

const FALLBACK_STAGE = ".fallback";
const SECRET_UPDATED_AT_ENV = "SST_ADMIN_SECRET_UPDATED_AT";

const PREFIX = {
  get STAGE() {
    const project = useProject();
    return `/sst/${project.config.name}/${project.config.stage}/`;
  },
  get FALLBACK() {
    const project = useProject();
    return `/sst/${project.config.name}/${FALLBACK_STAGE}/`;
  },
};

function parse(ssmName: string) {
  const parts = ssmName.split("/");
  return {
    type: parts[4],
    id: parts[5],
    prop: parts.slice(6),
  };
}
