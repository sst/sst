import fs from "fs";
import * as iam from "aws-cdk-lib/aws-iam";
import { App } from "./App.js";
import { Secret } from "./Secret.js";
import { Parameter } from "./Parameter.js";
import { FunctionConfig } from "@serverless-stack/core";

export function assertNameNotInUse(name: string) {
  if (Secret.hasName(name) || Parameter.hasName(name)) {
    throw new Error(`Config ${name} already exists`);
  }
}

export function codegenTypes() {
  fs.appendFileSync(
    "node_modules/@types/serverless-stack__node/index.d.ts",
    `export * from "./config";`
  );
  fs.writeFileSync(
    "node_modules/@types/serverless-stack__node/config.d.ts",
    `
    import "@serverless-stack/node/config";
    declare module "@serverless-stack/node/config" {
    export interface ConfigType {
      ${[
      "APP",
      "STAGE",
      ...Parameter.getAllNames(),
      ...Secret.getAllNames()
    ].map((p) => `${p}: string;`).join("\n")}
    }
  }`
  );
}

export function configToEnvironmentVariables(config: (Secret | Parameter)[]): Record<string, string> {
  const env: Record<string, string> = {};

  (config || []).forEach((c) => {
    if (c instanceof Secret) {
      env[`${FunctionConfig.SECRET_ENV_PREFIX}${c.name}`] = "1";
    } else if (c instanceof Parameter) {
      env[`${FunctionConfig.PARAM_ENV_PREFIX}${c.name}`] = c.value;
    }
  });

  return env;
}

export function configToPolicyStatement(app: App, config: (Secret | Parameter)[]): iam.PolicyStatement | undefined {
  const iamResources: string[] = [];
  (config || [])
    .filter((c) => c instanceof Secret)
    .forEach((c) =>
      iamResources.push(
        `arn:aws:ssm:${app.region}:${app.account
        }:parameter${FunctionConfig.buildSsmNameForSecret(
          app.name,
          app.stage,
          c.name
        )}`,
        `arn:aws:ssm:${app.region}:${app.account
        }:parameter${FunctionConfig.buildSsmNameForSecretFallback(
          app.name,
          c.name
        )}`
      )
    );

  if (iamResources.length === 0) {
    return;
  }

  return new iam.PolicyStatement({
    actions: ["ssm:GetParameters"],
    effect: iam.Effect.ALLOW,
    resources: iamResources,
  });
}

export { Secret, Parameter };
