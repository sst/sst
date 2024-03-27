import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform, transform } from "../component";

export interface KvArgs {
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the R2 KV namespace resource.
     */
    namespace?: Transform<cloudflare.WorkersKvNamespaceArgs>;
  };
}

/**
 * The `Kv` component lets you add a [Cloudflare KV storage namespace](https://developers.cloudflare.com/kv/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * const storage = new sst.cloudflare.Kv("MyStorage");
 * ```
 */
export class Kv extends Component {
  private namespace: cloudflare.WorkersKvNamespace;

  constructor(name: string, args?: KvArgs, opts?: ComponentResourceOptions) {
    super("sst:cloudflare:Kv", name, args, opts);

    const parent = this;

    const namespace = createNamespace();

    this.namespace = namespace;

    function createNamespace() {
      return new cloudflare.WorkersKvNamespace(
        `${name}Namespace`,
        transform(args?.transform?.namespace, {
          title: name,
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
        }),
        { parent },
      );
    }
  }

  /**
   * The generated id of the KV namespace.
   */
  public get id() {
    return this.namespace.id;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Cloudflare KV namespace.
       */
      namespace: this.namespace,
    };
  }
}
