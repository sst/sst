import { App, Function as Fn } from "@serverless-stack/resources";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import fs from "fs";

export class Parameter extends Construct {
  public readonly name: string;
  private static readonly all = new Set<string>();

  constructor(scope: Construct, name: string, value?: string) {
    super(scope, name);
    const app = App.of(scope) as App;
    Parameter.all.add(name);
    this.name = name;

    if (value) {
      new StringParameter(this, name, {
        parameterName: `/${app.name}/${app.stage}/${name}`,
        stringValue: value,
      });
    }
  }

  public static Secret = Symbol();

  public static create<
    T extends Record<string, string | typeof Parameter.Secret>
  >(scope: Construct, params: T) {
    const result: Record<string, Parameter> = {};
    for (const [key, value] of Object.entries(params)) {
      result[key] = new Parameter(
        scope,
        key,
        typeof value === "string" ? value : undefined
      );
    }

    return result as Record<keyof T, Parameter>;
  }

  public static use(func: Fn, ...params: Parameter[]) {
    const values = params.map((p) => p.name).join(",");
    const app = App.of(params[0]) as App;
    const policy = new PolicyStatement({
      resources: params.flatMap((p) => [
        `arn:aws:ssm:${app.region}:${app.account}:parameter/${app.name}/${app.stage}/${p.name}`,
        `arn:aws:ssm:${app.region}:${app.account}:parameter/${app.name}/fallback/${p.name}`,
      ]),
      actions: ["*"],
      effect: Effect.ALLOW,
    });
    func.addToRolePolicy(policy);
    func.addEnvironment("SSM_VALUES", values);
    func.addEnvironment("SSM_PREFIX", `/${app.name}/${app.stage}/`);
  }

  public static codegen() {
    fs.mkdirSync("node_modules/@types/sst-parameters", {
      recursive: true,
    });
    fs.writeFileSync(
      "node_modules/@types/sst-parameters/package.json",
      JSON.stringify({
        types: "index.d.ts",
      })
    );
    fs.writeFileSync(
      "node_modules/@types/sst-parameters/index.d.ts",
      `
     import "@serverless-stack/node/config";
     declare module "@serverless-stack/node/config" {
      export interface ConfigType {
        ${[...Parameter.all].map((p) => `${p}: string`).join(",\n")}
      }
    }`
    );
  }
}
