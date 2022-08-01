import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { FunctionConfig } from "@serverless-stack/core";
import { App } from "./App.js";
import { assertNameNotInUse } from "./Config.js";

export interface ParameterProps {
  /**
   * Value of the parameter
   */
  value: string;
}

/**
 * The `Parameter` construct is a higher level CDK construct that makes it easy to manage app environment variables.
 *
 * @example
 * ### Using the minimal config
 *
 * ```js
 * import { Config } from "@serverless-stack/resources";
 *
 * new Config.Parameter(stack, "TABLE_NAME", table.tableName);
 * ```
 */
export class Parameter extends Construct {
  public readonly name: string;
  public readonly value: string;
  private static all = new Set<string>();

  constructor(scope: Construct, id: string, props: ParameterProps) {
    super(scope, id);

    const { value } = props;
    const app = scope.node.root as App;
    this.name = id;
    this.value = value;

    assertNameNotInUse(id);

    Parameter.all.add(id);

    // Create SSM parameter
    new ssm.StringParameter(this, "Parameter", {
      parameterName: FunctionConfig.buildSsmNameForParameter(app.name, app.stage, id),
      stringValue: value,
    });
  }

  public static getAllNames() {
    return Array.from(Parameter.all);
  }

  public static hasName(name: string) {
    return Parameter.all.has(name);
  }

  public static clear() {
    return Parameter.all = new Set<string>();
  }

  public getConstructMetadata() {
    return {
      type: "Parameter" as const,
      data: {
        name: this.name,
      },
    };
  }
}
