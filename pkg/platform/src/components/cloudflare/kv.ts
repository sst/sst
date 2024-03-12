import {
  ComponentResourceOptions,
  output,
  interpolate,
  all,
  Output,
} from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { RandomId } from "@pulumi/random";
import {
  prefixName,
  hashNumberToPrettyString,
  hashStringToPrettyString,
  sanitizeToPascalCase,
} from "../naming";
import { Component, Transform, transform } from "../component";
import type { Input } from "../input";

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
 * const myStorage = new sst.cloudflare.Kv("MyStorage");
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
          accountId: $app.providers?.cloudflare?.accountId!,
        }),
        { parent },
      );
    }
  }

  /**
   * The generated name of the KV namespace.
   */
  public get title() {
    return this.namespace.title;
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
