import { output } from "@pulumi/pulumi";
import { Link } from "./link";
import { Component } from "./component";

export interface Definition<
  Properties extends Record<string, any> = Record<string, any>,
> {
  properties: Properties;
  include?: {
    type: string;
    [key: string]: any;
  }[];
}

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

  public get properties() {
    return this._definition.properties;
  }

  /** @internal */
  public getSSTLink() {
    return this._definition;
  }

  public static wrap<Resource>(
    obj: { new (...args: any[]): Resource },
    cb: (resource: Resource) => Definition,
  ) {
    obj.prototype.getSSTLink = function () {
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
