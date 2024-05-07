import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";

export interface D1Args {
  /**
   * [Transform](/docs/components/#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the D1 resource.
     */
    database?: Transform<cloudflare.D1DatabaseArgs>;
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
 *
 * #### Link to a worker
 *
 * You can link the db to a worker.
 *
 * ```ts {3}
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "./index.ts",
 *   link: [db],
 *   url: true
 * });
 * ```
 *
 * Once linked, you can use the SDK to interact with the db.
 *
 * ```ts title="index.ts" {3}
 * import { Resource } from "sst";
 *
 * await Resource.MyDatabase.prepare(
 *   "SELECT id FROM todo ORDER BY id DESC LIMIT 1",
 * ).first();
 * ```
 */
export class D1 extends Component implements Link.Cloudflare.Linkable {
  private database: cloudflare.D1Database;

  constructor(name: string, args?: D1Args, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const db = createDB();

    this.database = db;

    function createDB() {
      return new cloudflare.D1Database(
        `${name}Database`,
        transform(args?.transform?.database, {
          name,
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
        }),
        { parent },
      );
    }
  }

  /**
   * @internal
   */
  getCloudflareBinding(): Link.Cloudflare.Binding {
    return {
      type: "d1DatabaseBindings",
      properties: {
        databaseId: this.database.id,
      },
    };
  }

  /**
   * The generated id of the D1 database.
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
