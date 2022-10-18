import { GetParametersCommand, SSMClient, Parameter } from "@aws-sdk/client-ssm";
const ssm = new SSMClient({});

const SECRET_ENV_PREFIX = "SST_Secret_";
const PARAM_ENV_PREFIX = "SST_Parameter_";
const SECRET_SSM_PREFIX = `/sst/${process.env.SST_APP}/${process.env.SST_STAGE}/secrets/`;
const SECRET_FALLBACK_SSM_PREFIX = `/sst/${process.env.SST_APP}/.fallback/secrets/`;

export interface ConfigTypes { };
export interface ParameterResources { };
export interface SecretResources { };
export const Config = new Proxy<ConfigTypes & ParameterResources & SecretResources>({} as any, {
  get(target, prop, receiver) {
    if (!(prop in target)) {
      throw new Error(`Config.${String(prop)} has not been bound for this function.`);
    }
    return Reflect.get(target, prop, receiver);
  }
});

storeMetadataInConfig();
await storeSecretsInConfig();
storeParametersInConfig();

///////////////
// Functions
///////////////

function storeMetadataInConfig() {
  // If SST_APP and SST_STAGE are not set, it is likely the
  // user is using an older version of SST.
  const errorMsg = "This is usually the case when you are using an older version of SST. Please update SST to the latest version to use the SST Config feature.";
  if (!process.env.SST_APP) {
    throw new Error(`Cannot find the SST_APP environment variable. ${errorMsg}`);
  }
  if (!process.env.SST_STAGE) {
    throw new Error(`Cannot find the SST_STAGE environment variable. ${errorMsg}`);
  }
  // @ts-ignore
  Config.APP = process.env.SST_APP;
  // @ts-ignore
  Config.STAGE = process.env.SST_STAGE;
}

async function storeSecretsInConfig() {
  // Find all the secrets and params that match the prefix
  const names = Object.keys(process.env)
    .filter((key) => key.startsWith(SECRET_ENV_PREFIX))
    .map(envNameToSecretName);
  if (names.length === 0) {
    return;
  }

  // Fetch all secrets
  const secrets = [];
  const results = await loadSecrets(SECRET_SSM_PREFIX, names);
  secrets.push(...results.validParams);
  if (results.invalidParams.length > 0) {
    // Fetch fallback
    const missingNames = results.invalidParams.map(ssmNameToConfigName);
    const missingResults = await loadSecrets(SECRET_FALLBACK_SSM_PREFIX, missingNames);
    secrets.push(...missingResults.validParams);
    if (missingResults.invalidParams.length > 0) {
      throw new Error(
        `The following secrets were not found: ${names.join(", ")}`
      );
    }
  }

  // Store all secrets in a map
  for (const item of secrets) {
    const name = ssmNameToConfigName(item.Name!);
    // @ts-ignore
    Config[name] = item.Value!;
  }
}

function storeParametersInConfig() {
  Object.keys(process.env)
    .filter((key) => key.startsWith(PARAM_ENV_PREFIX))
    .forEach((key) => {
      const name = envNameToParameterName(key);
      // @ts-ignore
      Config[name] = process.env[key];
    });
}

async function loadSecrets(prefix: string, keys: string[]) {
  // Split keys into chunks of 10
  const chunks = [];
  for (let i = 0; i < keys.length; i += 10) {
    chunks.push(keys.slice(i, i + 10));
  }

  // Fetch secrets
  const validParams: Parameter[] = [];
  const invalidParams: string[] = [];
  await Promise.all(
    chunks.map(async (chunk) => {
      const command = new GetParametersCommand({
        Names: chunk.map((key) => `${prefix}${key}`),
        WithDecryption: true,
      });
      const result = await ssm.send(command);
      validParams.push(...(result.Parameters || []));
      invalidParams.push(...(result.InvalidParameters || []));
    })
  );
  return { validParams, invalidParams };
}

function ssmNameToConfigName(ssmName: string) {
  return ssmName.split("/").pop()!;
}

function envNameToSecretName(ssmName: string) {
  return ssmName.replace(new RegExp(`^${SECRET_ENV_PREFIX}`), "");
}

function envNameToParameterName(ssmName: string) {
  return ssmName.replace(new RegExp(`^${PARAM_ENV_PREFIX}`), "");
}
