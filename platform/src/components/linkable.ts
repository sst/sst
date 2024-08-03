import { output } from "@pulumi/pulumi";
import { Link } from "./link";
import { Component } from "./component";

export interface Definition<
  Properties extends Record<string, any> = Record<string, any>,
> {
  /**
   * Define values that the linked resource can access at runtime. These can be outputs
   * from other resources or constants.
   *
   * @example
   * ```ts
   * {
   *   properties: { foo: "bar" }
   * }
   * ```
   */
  properties: Properties;
  /**
   * Include AWS permissions or Cloudflare bindings for the linkable resource. The linked
   * resource will have these permissions or bindings.
   *
   * @example
   * Include AWS permissions.
   *
   * ```ts
   * {
   *   include: [
   *     sst.aws.permission({
   *       actions: ["lambda:InvokeFunction"],
   *       resources: ["*"]
   *     })
   *   ]
   * }
   * ```
   *
   * Include Cloudflare bindings.
   *
   * ```ts
   * {
   *   include: [
   *     sst.cloudflare.binding({
   *       type: "r2BucketBindings",
   *       properties: {
   *         bucketName: "my-bucket"
   *       }
   *     })
   *   ]
   * }
   * ```
   */
  include?: {
    type: string;
    [key: string]: any;
  }[];
}

/**
 * The `Linkable` component and the `Linkable.wrap` method lets you link any resources in your
 * app; not just the built-in SST components.
 *
 * @example
 *
 * #### Linking any value
 *
 * The `Linkable` component takes a list of properties that you want to link. These can be
 * outputs from other resources or constants.
 *
 * ```ts title="sst.config.ts"
 * new sst.Linkable("MyLinkable", {
 *   properties: { foo: "bar" }
 * });
 * ```
 *
 * You can also use this to combine multiple resources into a single linkable resource.
 *
 * ```ts title="sst.config.ts"
 * const bucketA = new sst.aws.Bucket("MyBucketA");
 * const bucketB = new sst.aws.Bucket("MyBucketB");
 *
 * const storage = new sst.Linkable("MyStorage", {
 *   properties: {
 *     bucketA: bucketA.name,
 *     bucketB: bucketB.name
 *   }
 * });
 * ```
 *
 * You can optionally include permissions or bindings for the linked resource.
 *
 * ```ts title="sst.config.ts"
 * const storage = new sst.Linkable("MyStorage", {
 *   properties: {
 *     bucketA: bucketA.name,
 *     bucketB: bucketB.name
 *   },
 *   include: [
 *     sst.aws.permission({
 *       actions: ["s3:*"],
 *       resources: [bucketA.arn, bucketB.arn]
 *     })
 *   ]
 * });
 * ```
 *
 * #### Link to a resource
 *
 * You can now link this resource to your frontend or a function.
 *
 * ```ts title="sst.config.ts" {3}
 * new sst.aws.Function("MyApi", {
 *   handler: "src/lambda.handler",
 *   link: [storage]
 * });
 * ```
 *
 * Then use the [SDK](/docs/reference/sdk/) to access them at runtime.
 *
 * ```js title="src/lambda.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyStorage.bucketA);
 * ```
 *
 * #### Linking any resource
 *
 * You can also wrap any Pulumi Resource class to make it linkable.
 *
 * ```ts title="sst.config.ts"
 * Linkable.wrap(aws.dynamodb.Table, (table) => ({
 *   properties: { tableName: table.name },
 *   include: [
 *     sst.aws.permission({
 *       actions: ["dynamodb:*"],
 *       resources: [table.arn]
 *     })
 *   ]
 * }));
 * ```
 *
 * Now you create an instance of `aws.dynamodb.Table` and link it in your app like any other SST
 * component.
 *
 * ```ts title="sst.config.ts" {7}
 * const table = new aws.dynamodb.Table("MyTable", {
 *   attributes: [{ name: "id", type: "S" }],
 *   hashKey: "id"
 * });
 *
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [table]
 * });
 * ```
 *
 * And use the [SDK](/docs/reference/sdk/) to access it at runtime.
 *
 * ```js title="app/page.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyTable.tableName);
 * ```
 */
export class Linkable<T extends Record<string, any>>
  extends Component
  implements Link.Linkable {
  private _name: string;
  private _definition: Definition<T>;

  public static wrappedResources = new Set<string>();

  constructor(name: string, definition: Definition<T>) {
    super("sst:sst:Linkable", name, definition, {});
    this._name = name;
    this._definition = definition;
  }

  public get name() {
    return output(this._name);
  }

  public get properties() {
    return this._definition.properties;
  }

  /** @internal */
  public getSSTLink() {
    return this._definition;
  }

  /**
   * Wrap any Pulumi Resource class to make it linkable. Behind the scenes this modifies the
   * prototype of the given class.
   *
   * @param cls The Pulumi Resource class to wrap.
   * @param cb A callback that returns the definition for the linkable resource.
   *
   * @example
   *
   * Here we are wrapping the [`aws.dynamodb.Table`](https://www.pulumi.com/registry/packages/aws/api-docs/dynamodb/table/)
   * class to make it linkable.
   *
   * ```ts title="sst.config.ts"
   * Linkable.wrap(aws.dynamodb.Table, (table) => ({
   *   properties: { tableName: table.name },
   *   include: [
   *     sst.aws.permission({
   *       actions: ["dynamodb:*"],
   *       resources: [table.arn]
   *     })
   *   ]
   * }));
   * ```
   *
   * It's defining the properties that we want made accessible at runtime and the permissions
   * that the linked resource should have.
   *
   * Now you can link any `aws.dynamodb.Table` instances in your app just like any other SST
   * component.
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
    cls: { new(...args: any[]): Resource },
    cb: (resource: Resource) => Definition,
  ) {
    // @ts-expect-error
    this.wrappedResources.add(cls.__pulumiType);

    cls.prototype.getSSTLink = function() {
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
