import SSM, { ParameterList, PutParameterRequest, PutParameterResult, GetParametersByPathRequest, GetParametersByPathResult } from "aws-sdk/clients/ssm.js";
import { log } from "./util.js";

const ssm = new SSM({
  logger: console,
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

    // do not migrate if was using snapshot releases
    if (majorVersion === 0 && minorVersion === 0) { return; }

    const needToMigrate = (
      // migrating from v0
      majorVersion < 1 ||
      // migrating from v1 (prior to v1.16)
      majorVersion === 1 && minorVersion < 16
    );
    if (!needToMigrate) { return; }
  }

  // Load secrets
  const prefix = `/sst/${app}/${stage}/secrets/`;
  const secrets = await ssmGetAllPrametersByPath(prefix);

  // Migrate secrets
  for (const secret of secrets) {
    const name = secret.Name!.split("/")[5];
    // Do not migrate SST Auth secrets b/c they are no longer secrets in v1.16.
    if (name === "SST_AUTH_PRIVATE" || name === "SST_AUTH_PUBLIC") {
      continue;
    }
    const newKey = `/sst/${app}/${stage}/Secret/${name}/value`;
    await ssmPutParameter({
      Name: newKey,
      Value: secret.Value!,
      Type: secret.Type!,
      Overwrite: true,
    });
  }
}

async function ssmGetAllPrametersByPath(prefix: string, token?: string): Promise<ParameterList> {
  // Create a function that load all pages of secrets
  const result = await ssmGetParametersByPath({
    WithDecryption: true,
    Recursive: true,
    Path: prefix,
    NextToken: token,
  });
  return [
    ...(result.Parameters || []),
    ...(result.NextToken ? await ssmGetAllPrametersByPath(prefix, result.NextToken) : []),
  ];
}

async function ssmGetParametersByPath(params: GetParametersByPathRequest): Promise<GetParametersByPathResult> {
  try {
    return await ssm.getParametersByPath(params).promise();
  } catch (e) {
    if (isRetryableException(e)) {
      return await ssmGetParametersByPath(params);
    }
    throw e;
  }
}

async function ssmPutParameter(params: PutParameterRequest): Promise<PutParameterResult> {
  try {
    return await ssm.putParameter(params).promise();
  } catch (e) {
    if (isRetryableException(e)) {
      return await ssmPutParameter(params);
    }
    throw e;
  }
}

function isRetryableException(e: any) {
  return (
    (e.code === "ThrottlingException" && e.message === "Rate exceeded") ||
    (e.code === "Throttling" && e.message === "Rate exceeded") ||
    (e.code === "TooManyRequestsException" &&
      e.message === "Too Many Requests") ||
    e.code === "TooManyUpdates" ||
    e.code === "OperationAbortedException" ||
    e.code === "TimeoutError" ||
    e.code === "NetworkingError"
  );
}