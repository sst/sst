import { output } from "@pulumi/pulumi";
import { Link } from "./link";
import { Component } from "./component";

export interface Definition<
  Properties extends Record<string, any> = Record<string, any>,
> {
  /**
   * Defining values that can be linked in your app.
   * @example
   * ```ts
   * {
   *   properties: { foo: "bar" },
   * }
   * ```
   */
  properties: Record<string, any>;
  /**
   * Defining AWS permissions or Cloudflare bindings for the linkable resource.
   * @example
   * Defining AWS permissions.
   * ```ts
   * {
   *   include: [
   *     aws.permission({
   *       actions: ["lambda:InvokeFunction"],
   *       resources: ["*"],
   *     }),
   *   ],
   * }
   * ```
   *
   * Defining Cloudflare bindings.
   * ```ts
   * {
   *   include: [
   *     cloudflare.permission({
   *       type: "r2BucketBindings";
   *       properties: {
   *         text: "my-bucket",
   *       };
   *     }),
   *   ],
   * }
   * ```
   */
  include: any[];
}

/**
 * The `Linkable` component lets you link values in your app.
 * @example
 * Similar to linking an SST component, you can link any value in your app.
 * ```ts title="sst.config.ts"
 * const linkable = new sst.Linkable("MyLinkable",{
 *   properties: { foo: "bar" },
 * });
 * ```
 *
 * Then use the [SDK](/docs/reference/sdk/) to access the linked resource in your
 * runtime in a typesafe way.
 *
 * ```js title="src/lambda.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyLinkable.foo);
 * ```
 */
export class Linkable<T extends Record<string, any>>
  extends Component
  implements Link.Linkable
{
  private _name: string;
  private _definition: Definition<T>;

  constructor(name: string, definition: Definition<T>) {
    super("sst:sst:Linkable", name, definition, {});
    this._name = name;
    this._definition = definition;
  }

  public get name() {
    return output(this._name);
  }

  public get properties(): Record<string, any> {
    return this._definition.properties;
  }

  /** @internal */
  public getSSTLink() {
    return this._definition;
  }

  /**
   * Wrap a Pulumi Resource class to make it linkable.
   *
   * @param cls The Pulumi Resource class to wrap.
   * @param cb A callback that returns the definition for the linkable resource.
   *
   * @example
   * The following example wraps the [`aws.dynamodb.Table`](https://www.pulumi.com/registry/packages/aws/api-docs/dynamodb/table/)
   * class to make it linkable.
   *
   * ```ts title="sst.config.ts"
   * Linkable.wrap(aws.dynamodb.Table, (table) => ({
   *   properties: { tableName: table.name },
   *   include: [
   *     permission({
   *       actions: ["dynamodb:*"],
   *       resources: [table.arn, interpolate`${table.arn}/`],
   *     }),
   *   ],
   * }));
   * ```
   *
   * Then you can link any `aws.dynamodb.Table` instances in your app as if they were SST
   * components.
   *
   * ```ts title="sst.config.ts" {7}
   * const table = new aws.dynamodb.Table("MyTable", {
   *   attributes: [{ name: "id", type: "S" }],
   *   hashKey: "id",
   * });
   *
   * new sst.aws.Nextjs("MyWeb", {
   *   link: [table]
   * });
   * ```
   */
  public static wrap<Resource>(
    cls: { new (...args: any[]): "RESOURCE_CLASS" },
    cb: (resource: "RESOURCE_CLASS") => Definition,
  ) {
    cls.prototype.getSSTLink = function () {
      return cb(this);
    };
  }
}

/**
 * @deprecated
 * Use sst.Linkable instead.
 */
export class Resource extends Component implements Link.Linkable {
  private _properties: any;
  private _name: string;

  constructor(name: string, properties: any) {
    super(
      "sst:sst:Resource",
      name,
      {
        properties,
      },
      {},
    );
    console.warn("Resource is deprecated. Use sst.Linkable instead.");
    this._properties = properties;
    this._name = name;
  }

  public get name() {
    return output(this._name);
  }

  public get properties() {
    return this._properties;
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: this._properties,
    };
  }
}
