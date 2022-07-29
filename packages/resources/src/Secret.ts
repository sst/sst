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

  public static getAllNames(): string[] {
    return Array.from(Secret.all);
  }

  public static hasName(name: string) {
    return Secret.all.has(name);
  }

  public static clear() {
    return Secret.all = new Set<string>();
  }

  public getConstructMetadata() {
    return {
      type: "Secret" as const,
      data: {
        name: this.name,
      },
    };
  }
}
