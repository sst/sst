import { Construct } from "constructs";
import { assertNameNotInUse } from "./Config.js";

/**
 * The `Secret` construct is a higher level CDK construct that makes it easy to manage app secrets.
 *
 * @example
 * ### Using the minimal config
 *
 * ```js
 * import { Config } from "@serverless-stack/resources";
 *
 * new Config.Secret(stack, "STRIPE_KEY");
 * ```
 */
export class Secret extends Construct {
  public readonly name: string;
  private static all = new Set<string>();

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.name = id;

    assertNameNotInUse(id);

    Secret.all.add(id);
  }

  /** @internal */
  public static getAllNames(): string[] {
    return Array.from(Secret.all);
  }

  /** @internal */
  public static hasName(name: string) {
    return Secret.all.has(name);
  }

  /** @internal */
  public static clear() {
    Secret.all.clear();
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

  public static create<T extends string[]>(scope: Construct, ...parameters: T) {
    const result: Record<string, Secret> = {};
    for (const name of parameters) {
      result[name] = new Secret(scope, name);
    }
    return result as { [key in T[number]]: Secret };
  }
}
