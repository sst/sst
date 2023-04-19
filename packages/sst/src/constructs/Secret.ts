import { Construct } from "constructs";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { SSTConstruct } from "./Construct.js";
import {
  getParameterPath,
  getParameterFallbackPath,
  FunctionBindingProps,
} from "./util/functionBinding.js";

/**
 * The `Secret` construct is a higher level CDK construct that makes it easy to manage app secrets.
 *
 * @example
 * ### Using the minimal config
 *
 * ```js
 * import { Config } from "sst/constructs";
 *
 * new Config.Secret(stack, "STRIPE_KEY");
 * ```
 */
export class Secret extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly name: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.id = id;
    this.name = id;
  }

  /** @internal */
  public getConstructMetadata() {
    return {
      type: "Secret" as const,
      data: {
        name: this.name,
      },
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    const app = this.node.root as App;
    const partition = Stack.of(this).partition;
    return {
      clientPackage: "config",
      variables: {
        value: {
          type: "secret",
        },
      },
      permissions: {
        "ssm:GetParameters": [
          `arn:${partition}:ssm:${app.region}:${
            app.account
          }:parameter${getParameterPath(this, "value")}`,
          `arn:${partition}:ssm:${app.region}:${
            app.account
          }:parameter${getParameterFallbackPath(this, "value")}`,
        ],
      },
    };
  }

  public static create<T extends string[]>(scope: Construct, ...parameters: T) {
    const result: Record<string, Secret> = {};
    for (const name of parameters) {
      result[name] = new Secret(scope, name);
    }
    return result as { [key in T[number]]: Secret };
  }
}
