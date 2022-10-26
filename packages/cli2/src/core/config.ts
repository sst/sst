import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import { mapKeys, pipe, mapValues } from "remeda";
import { useProject } from "./app";
import { useAWSClient } from "./credentials";

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
        mapKeys((k) => `${PREFIXES.SECRETS.ENV}${k}`),
        mapValues((v) => v.value || v.fallback)
      ),
      ...parameters,
    };

    return env as typeof env & Record<string, string | undefined>;
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
