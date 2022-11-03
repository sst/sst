import { Construct } from "constructs";
import { App } from "./App.js";
import { SSTConstruct } from "./Construct.js";

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
export class Parameter extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly name: string;
  public readonly value: string;

  constructor(scope: Construct, id: string, props: ParameterProps) {
    super(scope, id);

    this.id = id;
    this.name = id;
    this.value = props.value;
  }

  /** @internal */
  public getConstructMetadata() {
    return {
      type: "Parameter" as const,
      data: {
        name: this.name,
      },
    };
  }

  /** @internal */
  public getFunctionBinding() {
    return {
      clientPackage: "config",
      variables: {
        value: {
          environment: this.value,
          parameter: this.value,
        },
      },
      permissions: {},
    };
  }

  public static create<T extends Record<string, any>>(
    scope: Construct,
    parameters: T
  ) {
    const result: Record<string, Parameter> = {};
    for (const [name, value] of Object.entries(parameters)) {
      result[name] = new Parameter(scope, name, { value });
    }

    return result as { [key in keyof T]: Parameter };
  }
}
