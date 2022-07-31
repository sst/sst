import SSM, { ParameterList } from "aws-sdk/clients/ssm.js";

type Secret = {
  value?: string,
  fallbackValue?: string,
}

export const SECRET_ENV_PREFIX = "SST_SECRET_";
export const PARAM_ENV_PREFIX = "SST_PARAM_";
export const FALLBACK_STAGE = ".fallback";

export async function listSecrets(app: string, stage: string, region: string) {
  const ssm = new SSM({ region });

  // Create a function that load all pages of secrets
  async function page(prefix: string, token?: string): Promise<ParameterList> {
    const result = await ssm
      .getParametersByPath({
        WithDecryption: true,
        Recursive: true,
        Path: prefix,
        NextToken: token,
      })
      .promise();
    return [
      ...(result.Parameters || []),
      ...(result.NextToken ? await page(prefix, result.NextToken) : []),
    ];
  }

  // Initialize results
  const results: Record<string, Secret> = {};

  // Load all secrets
  const secrets = await page(buildSsmPrefixForSecret(app, stage));
  secrets.map((p) => {
    const name = parseSsmName(p.Name!).name;
    if (!results[name]) {
      results[name] = {};
    }
    results[name].value = p.Value!;
  });

  // Load all fallback secrets
  const fallbacks = await page(buildSsmPrefixForSecretFallback(app));
  fallbacks.map((p) => {
    const name = parseSsmName(p.Name!).name;
    if (!results[name]) {
      results[name] = {};
    }
    results[name].fallbackValue = p.Value!;
  });

  return results;
}

export async function getSecret(app: string, stage: string, region: string, name: string) {
  const ssm = new SSM({ region });
  const result = await ssm
    .getParameters({
      Names: [
        buildSsmNameForSecret(app, stage, name),
        buildSsmNameForSecretFallback(app, name),
      ],
      WithDecryption: true,
    })
    .promise();

  const secret: Secret = {};
  result.Parameters?.forEach((p) => {
    const parts = parseSsmName(p.Name!);
    if (parts.stage === stage) {
      secret.value = p.Value;
    }
    else {
      secret.fallbackValue = p.Value;
    }
  });
  return secret;
}

export async function setSecret(app: string, stage: string, region: string, name: string, value: string) {
  const ssm = new SSM({ region });
  await ssm.putParameter({
    Name: buildSsmNameForSecret(app, stage, name),
    Value: value,
    Type: "SecureString",
    Overwrite: true,
  }).promise();
}

export async function setSecretFallback(app: string, region: string, name: string, value: string) {
  return await setSecret(app, FALLBACK_STAGE, region, name, value);
}

export async function removeSecret(app: string, stage: string, region: string, name: string) {
  const ssm = new SSM({ region });
  try {
    await ssm.deleteParameter({
      Name: buildSsmNameForSecret(app, stage, name),
    }).promise();
  } catch(e: any) {
    if (e.code === "ParameterNotFound") {
      return;
    }
    throw e;
  }
}

export async function removeSecretFallback(app: string, region: string, name: string) {
  return await removeSecret(app, FALLBACK_STAGE, region, name);
}

export function buildSsmPrefixForSecret(app: string, stage: string) {
  return `/sst/${app}/${stage}/secrets/`;
}

export function buildSsmPrefixForSecretFallback(app: string) {
  return buildSsmPrefixForSecret(app, FALLBACK_STAGE);
}

export function buildSsmPrefixForParameter(app: string, stage: string) {
  return `/sst/${app}/${stage}/parameters/`;
}

function buildSsmNameForSecret(app: string, stage: string, name: string) {
  return `${buildSsmPrefixForSecret(app, stage)}${name}`;
}

function buildSsmNameForSecretFallback(app: string, name: string) {
  return buildSsmNameForSecret(app, FALLBACK_STAGE, name);
}

export function buildSsmNameForParameter(app: string, stage: string, name: string) {
  return `${buildSsmPrefixForParameter(app, stage)}${name}`;
}

function parseSsmName(ssmName: string) {
  const parts = ssmName.split("/");
  return {
    app: parts[2],
    stage: parts[3],
    type: parts[4],
    name: parts.slice(5).join("/"),
  };
}

export * as FunctionConfig from "./index.js";