import {
  GetParametersCommand,
  SSMClient,
  Parameter,
} from "@aws-sdk/client-ssm";
const ssm = new SSMClient({});
import {
  createProxy,
  parseEnvironment,
  buildSsmPath,
  buildSsmFallbackPath,
  ssmNameToConstructId,
  ssmFallbackNameToConstructId,
} from "../util/index.js";

export interface ParameterResources {}
export interface SecretResources {}

export interface ConfigTypes {}
export type ParameterTypes = {
  [T in keyof ParameterResources]: string;
};
export type SecretTypes = {
  [T in keyof SecretResources]: string;
};

export const Config = createProxy<ConfigTypes & ParameterTypes & SecretTypes>(
  "Config"
);
const metadata = parseMetadataEnvironment();
const parametersRaw = parseEnvironment("Parameter", ["value"]);
const secretsRaw = parseEnvironment("Secret", ["value"]);
const parameters = flattenConfigValues(parametersRaw);
const secrets = flattenConfigValues(secretsRaw);
await replaceSecretsWithRealValues();
Object.assign(Config, metadata, parameters, secrets);

///////////////
// Functions
///////////////

function parseMetadataEnvironment() {
  // If SST_APP and SST_STAGE are not set, it is likely the
  // user is using an older version of SST.
  const errorMsg =
    "This is usually the case when you are using an older version of SST. Please update SST to the latest version to use the SST Config feature.";
  if (!process.env.SST_APP) {
    throw new Error(
      `Cannot find the SST_APP environment variable. ${errorMsg}`
    );
  }
  if (!process.env.SST_STAGE) {
    throw new Error(
      `Cannot find the SST_STAGE environment variable. ${errorMsg}`
    );
  }
  return {
    APP: process.env.SST_APP,
    STAGE: process.env.SST_STAGE,
  };
}

function flattenConfigValues(
  configValues: ReturnType<typeof parseEnvironment>
) {
  const acc: Record<string, string> = {};
  Object.keys(configValues).forEach((name) => {
    acc[name] = configValues[name].value;
  });
  return acc;
}

async function replaceSecretsWithRealValues() {
  // Find all the secrets and params that match the prefix
  const names = Object.keys(secrets).filter(
    (name) => secrets[name] === "__FETCH_FROM_SSM__"
  );
  if (names.length === 0) {
    return;
  }

  // Fetch all secrets
  const paths = names.map((name) => buildSsmPath("Secret", name, "value"));
  const results = await loadSecrets(paths);
  results.validParams.forEach((item) => {
    const name = ssmNameToConstructId(item.Name!);
    secrets[name] = item.Value!;
  });

  // Fetch fallback secrets
  if (results.invalidParams.length > 0) {
    const missingNames = results.invalidParams.map(ssmNameToConstructId);
    const missingPaths = missingNames.map((name) =>
      buildSsmFallbackPath("Secret", name, "value")
    );
    const missingResults = await loadSecrets(missingPaths);
    missingResults.validParams.forEach((item) => {
      const name = ssmFallbackNameToConstructId(item.Name!);
      secrets[name] = item.Value!;
    });
    if (missingResults.invalidParams.length > 0) {
      throw new Error(
        `The following secrets were not found: ${missingNames.join(", ")}`
      );
    }
  }
}

async function loadSecrets(paths: string[]) {
  // Split paths into chunks of 10
  const chunks = [];
  for (let i = 0; i < paths.length; i += 10) {
    chunks.push(paths.slice(i, i + 10));
  }

  // Fetch secrets
  const validParams: Parameter[] = [];
  const invalidParams: string[] = [];
  await Promise.all(
    chunks.map(async (chunk) => {
      const command = new GetParametersCommand({
        Names: chunk,
        WithDecryption: true,
      });
      const result = await ssm.send(command);
      validParams.push(...(result.Parameters || []));
      invalidParams.push(...(result.InvalidParameters || []));
    })
  );
  return { validParams, invalidParams };
}
