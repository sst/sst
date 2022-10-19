import { createProxy, parseEnvironment } from "../util";
import { GetParametersCommand, SSMClient, Parameter } from "@aws-sdk/client-ssm";
const ssm = new SSMClient({});

const SECRET_SSM_PREFIX = `/sst/${process.env.SST_APP}/${process.env.SST_STAGE}/secrets/`;
const SECRET_FALLBACK_SSM_PREFIX = `/sst/${process.env.SST_APP}/.fallback/secrets/`;

export interface ConfigTypes { };
export interface ParameterResources { };
export interface SecretResources { };

export const Config = createProxy<ConfigTypes & ParameterResources & SecretResources>("Config");
const metadata = parseMetadataEnvironment();
const parameters = parseEnvironment("Parameter", ["."]);
const secrets = parseEnvironment("Secret", ["."]);
await replaceSecretsWithRealValues();
Object.assign(Config, metadata, parameters, secrets);

///////////////
// Functions
///////////////

function parseMetadataEnvironment() {
  // If SST_APP and SST_STAGE are not set, it is likely the
  // user is using an older version of SST.
  const errorMsg = "This is usually the case when you are using an older version of SST. Please update SST to the latest version to use the SST Config feature.";
  if (!process.env.SST_APP) {
    throw new Error(`Cannot find the SST_APP environment variable. ${errorMsg}`);
  }
  if (!process.env.SST_STAGE) {
    throw new Error(`Cannot find the SST_STAGE environment variable. ${errorMsg}`);
  }
  return {
    APP: process.env.SST_APP,
    STAGE: process.env.SST_STAGE,
  };
}

async function replaceSecretsWithRealValues() {
  // Find all the secrets and params that match the prefix
  const names = Object.keys(secrets);
  if (names.length === 0) {
    return;
  }

  // Fetch all secrets
  const ssmParams = [];
  const results = await loadSecrets(SECRET_SSM_PREFIX, names);
  ssmParams.push(...results.validParams);
  if (results.invalidParams.length > 0) {
    // Fetch fallback
    const missingNames = results.invalidParams.map(ssmNameToConfigName);
    const missingResults = await loadSecrets(SECRET_FALLBACK_SSM_PREFIX, missingNames);
    ssmParams.push(...missingResults.validParams);
    if (missingResults.invalidParams.length > 0) {
      throw new Error(
        `The following secrets were not found: ${names.join(", ")}`
      );
    }
  }

  // Store all secrets in a map
  for (const item of ssmParams) {
    const name = ssmNameToConfigName(item.Name!);
    // @ts-ignore
    secrets[name] = item.Value!;
  }
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