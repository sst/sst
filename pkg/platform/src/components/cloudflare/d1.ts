import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";

export interface D1Args {
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the D1 resource.
     */
    namespace?: Transform<cloudflare.D1DatabaseArgs>;
  };
}

/**
 * The `D1` component lets you add a [Cloudflare D1 database](https://developers.cloudflare.com/d1/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * const db = new sst.cloudflare.D1("MyDatabase");
 * ```
 */
export class D1 extends Component implements Link.Cloudflare.Linkable {
  private database: cloudflare.D1Database;

  constructor(name: string, args?: D1Args, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const namespace = createDB();

    this.database = namespace;

    function createDB() {
      return new cloudflare.D1Database(
        `${name}Database`,
        transform(args?.transform?.namespace, {
          name,
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
        }),
        { parent },
      );
    }
  }

  getCloudflareBinding(): Link.Cloudflare.Binding {
    return {
      type: "d1DatabaseBindings",
      properties: {
        databaseId: this.database.id,
      },
    };
  }

  /**
   * The generated id of the D1 namespace.
   */
  public get id() {
    return this.database.id;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Cloudflare D1 database.
       */
      database: this.database,
    };
  }
}

const __pulumiType = "sst:cloudflare:D1";
// @ts-expect-error
D1.__pulumiType = __pulumiType;
