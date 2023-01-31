import SSM, { ParameterList } from "aws-sdk/clients/ssm.js";
import { log } from "./util.js";

const ssm = new SSM({
  logger: console,
  maxRetries: 1000,
  retryDelayOptions: {
    customBackoff: () => 3000,
  },
});

export async function SecretsMigration(cfnRequest: any) {
  log("SecretsMigration()");
  const {
    App: app,
    Stage: stage,
  } = cfnRequest.ResourceProperties;
  const {
    SSTVersion: version,
  } = (cfnRequest.OldResourceProperties || {});

  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      await migrateSecretsSSMPath({ version, app, stage });
      await migrateSecretsSSMPath({ version, app, stage: ".fallback" });
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function migrateSecretsSSMPath(input: {
  version: string;
  app: string;
  stage: string;
}) {
  log("migrateSecretsSSMPath()", input);

  const { version, app, stage } = input;

  // Check if migration is needed
  if (version) {
    const parts = version.split(".");
    const majorVersion = parseInt(parts[0]);
    const minorVersion = parseInt(parts[1]);
    const needToMigrate = (majorVersion < 1 || majorVersion === 1 && minorVersion < 16);
    if (!needToMigrate) { return; }
  }

  // Load secrets
  const prefix = `/sst/${app}/${stage}/secrets/`;
  const secrets = await ssmGetPrametersByPath(prefix);

  // Migrate secrets
  for (const secret of secrets) {
    const name = secret.Name!.split("/")[5];
    // Do not migrate SST Auth secrets b/c they are no longer secrets in v1.16.
    if (name === "SST_AUTH_PRIVATE" || name === "SST_AUTH_PUBLIC") {
      continue;
    }
    const newKey = `/sst/${app}/${stage}/Secret/${name}/value`;
    await ssm.putParameter({
      Name: newKey,
      Value: secret.Value!,
      Type: secret.Type!,
      Overwrite: true,
    }).promise();
  }
}

async function ssmGetPrametersByPath(prefix: string, token?: string): Promise<ParameterList> {
  // Create a function that load all pages of secrets
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
    ...(result.NextToken ? await ssmGetPrametersByPath(prefix, result.NextToken) : []),
  ];
}