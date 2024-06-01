import { output } from "@pulumi/pulumi";
import { Link } from "./link";
import { Component } from "./component";

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
