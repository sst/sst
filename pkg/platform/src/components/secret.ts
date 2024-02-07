import { VisibleError } from "./error";
import { output, secret } from "@pulumi/pulumi";
import { Link } from "./link";
import { Component } from "./component";

export class SecretMissingError extends VisibleError {
  constructor(public readonly secretName: string) {
    super(
      `Set a value for ${secretName} with \`sst secrets set ${secretName} <value>\``,
    );
  }
}

export class Secret extends Component implements Link.Linkable {
  private _value: string;
  private _name: string;
  private _placeholder?: string;

  constructor(name: string, placeholder?: string) {
    super(
      "sst:sst:Secret",
      name,
      {
        placeholder,
      },
      {},
    );
    this._name = name;
    this._placeholder = placeholder;
    const value = process.env["SST_SECRET_" + this._name] ?? this._placeholder;
    if (!value) {
      throw new SecretMissingError(this._name);
    }
    this._value = value;
  }

  public get name() {
    return output(this._name);
  }

  public get value() {
    return secret(this._value);
  }

  public get placeholder() {
    return output(this._placeholder);
  }

  /** @internal */
  public getSSTLink(): Link.Definition {
    return {
      type: "string",
      value: this.value,
    };
  }
}
