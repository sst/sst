import S3 from "aws-sdk/clients/s3.js";
import SSM, { ParameterList } from "aws-sdk/clients/ssm.js";
import Lambda from "aws-sdk/clients/lambda.js";
import { Bootstrap } from "../bootstrap/index.js";
import { callAwsWithRetry } from "../index.js";

type Secret = {
  value?: string;
  fallbackValue?: string;
};

const SECRET_UPDATED_AT_ENV = "SST_ADMIN_SECRET_UPDATED_AT";
export const SECRET_ENV_PREFIX = "SST_SECRET_";
export const PARAM_ENV_PREFIX = "SST_PARAM_";
export const FALLBACK_STAGE = ".fallback";

async function ssmGetPrametersByPath(
  region: string,
  prefix: string,
  token?: string
): Promise<ParameterList> {
  const ssm = new SSM({ region });

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
    ...(result.NextToken
      ? await ssmGetPrametersByPath(region, prefix, result.NextToken)
      : []),
  ];
}

export async function listParameters(
  app: string,
  stage: string,
  region: string
) {
  const results: Record<string, string> = {};

  const params = await ssmGetPrametersByPath(
    region,
    buildSsmPrefixForParameter(app, stage)
  );
  params.map((p) => {
    const name = parseSsmName(p.Name!).name;
    results[name] = p.Value!;
  });
  return results;
}

export async function listSecrets(app: string, stage: string, region: string) {
  const results: Record<string, Secret> = {};

  // Load all secrets
  const secrets = await ssmGetPrametersByPath(
    region,
    buildSsmPrefixForSecret(app, stage)
  );
  secrets.map((p) => {
    const name = parseSsmName(p.Name!).name;
    if (!results[name]) {
      results[name] = {};
    }
    results[name].value = p.Value!;
  });

  // Load all fallback secrets
  const fallbacks = await ssmGetPrametersByPath(
    region,
    buildSsmPrefixForSecretFallback(app)
  );
  fallbacks.map((p) => {
    const name = parseSsmName(p.Name!).name;
    if (!results[name]) {
      results[name] = {};
    }
    results[name].fallbackValue = p.Value!;
  });

  return results;
}

export async function getSecret(
  app: string,
  stage: string,
  region: string,
  name: string
) {
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
    } else {
      secret.fallbackValue = p.Value;
    }
  });
  return secret;
}

export async function setSecret(
  app: string,
  stage: string,
  region: string,
  name: string,
  value: string
) {
  console.log(`Setting ${name}`);
  await setSecretDo(app, stage, region, name, value);
  await restartFunctionsUsingSecret(app, stage, region, name);
}

export async function setSecretFallback(
  app: string,
  region: string,
  name: string,
  value: string
) {
  await setSecretDo(app, FALLBACK_STAGE, region, name, value);
}

export async function removeSecret(
  app: string,
  stage: string,
  region: string,
  name: string
) {
  console.log(`Removing ${name}`);
  await removeSecretDo(app, stage, region, name);
  await restartFunctionsUsingSecret(app, stage, region, name);
}

export async function removeSecretFallback(
  app: string,
  region: string,
  name: string
) {
  await removeSecretDo(app, FALLBACK_STAGE, region, name);
}

async function setSecretDo(
  app: string,
  stage: string,
  region: string,
  name: string,
  value: string
) {
  const ssm = new SSM({ region });

  await ssm
    .putParameter({
      Name: buildSsmNameForSecret(app, stage, name),
      Value: value,
      Type: "SecureString",
      Overwrite: true,
    })
    .promise();
}

async function removeSecretDo(
  app: string,
  stage: string,
  region: string,
  name: string
) {
  const ssm = new SSM({ region });
  try {
    await ssm
      .deleteParameter({
        Name: buildSsmNameForSecret(app, stage, name),
      })
      .promise();
  } catch (e: any) {
    if (e.code === "ParameterNotFound") {
      return;
    }
    throw e;
  }
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

export function buildSsmNameForSecret(
  app: string,
  stage: string,
  name: string
) {
  return `${buildSsmPrefixForSecret(app, stage)}${name}`;
}

export function buildSsmNameForSecretFallback(app: string, name: string) {
  return buildSsmNameForSecret(app, FALLBACK_STAGE, name);
}

export function buildSsmNameForParameter(
  app: string,
  stage: string,
  name: string
) {
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

async function restartFunctionsUsingSecret(
  app: string,
  stage: string,
  region: string,
  name: string
) {
  const s3 = new S3({ region });
  const lambda = new Lambda({ region });

  await Bootstrap.init(region);

  // If the account is not in the bootstrap, it is not using this secret.
  if (!Bootstrap.assets.bucketName) {
    return [];
  }

  console.log(`Restarting all functions using ${name}`);

  // Download all files in folder
  const listRet = await callAwsWithRetry(() =>
    s3
      .listObjectsV2({
        Bucket: Bootstrap.assets.bucketName!,
        Prefix: `stackMetadata/app.${app}/stage.${stage}/`,
      })
      .promise()
  );

  // Get all functions using this secret
  await Promise.all(
    (listRet.Contents || []).map(async (c) => {
      // Download the file
      const ret = await callAwsWithRetry(() =>
        s3
          .getObject({
            Bucket: Bootstrap.assets.bucketName!,
            Key: c.Key!,
          })
          .promise()
      );
      // Parse the file
      const json = JSON.parse(ret.Body!.toString());
      await Promise.all(
        json
          .filter(
            (p: any) =>
              p.type === "Function" &&
              p.data.secrets &&
              p.data.secrets.includes(name)
          )
          .map(async (p: any) => {
            const ret = await callAwsWithRetry(() =>
              lambda
                .getFunctionConfiguration({
                  FunctionName: p.data.arn,
                })
                .promise()
            );
            await callAwsWithRetry(() =>
              lambda
                .updateFunctionConfiguration({
                  FunctionName: p.data.arn,
                  Environment: {
                    Variables: {
                      ...(ret.Environment?.Variables || {}),
                      [SECRET_UPDATED_AT_ENV]: Date.now().toString(),
                    },
                  },
                })
                .promise()
            );
          })
      );
    })
  );
}

export * as FunctionConfig from "./index.js";
