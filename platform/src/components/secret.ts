import { VisibleError } from "./error";
import { output, secret } from "@pulumi/pulumi";
import { Link } from "./link";
import { Component, Prettify } from "./component";

export class SecretMissingError extends VisibleError {
  constructor(public readonly secretName: string) {
    super(
      `Set a value for ${secretName} with \`sst secret set ${secretName} <value>\``,
    );
  }
}

/**
 * The `Secret` component lets you create secrets in your app.
 *
 * :::note
 * Secrets are encrypted when they are stored in your state file or in a function package.
 * :::
 *
 * Secrets are encrypted and stored in an S3 Bucket in your AWS account. If used in your app config, they'll be encrypted in your state file as well. If used in your function code, they'll be decrypted and stored in the function package.
 *
 * @example
 *
 * #### Create a secret
 *
 * The name of a secret follows the same rules as a component name. It must start with a capital letter and contain only letters and numbers.
 *
 * :::note
 * Secret names must start with a capital letter and contain only letters and numbers.
 * :::
 *
 * ```ts title="sst.config.ts"
 * const secret = new sst.Secret("MySecret");
 * ```
 *
 * #### Set a placeholder
 *
 * You can optionally set a `placeholder`.
 *
 * :::tip
 * Useful for cases where you might use a secret for values that aren't sensitive, so you can just set them in code.
 * :::
 *
 * ```ts title="sst.config.ts"
 * const secret = new sst.Secret("MySecret", "my-secret-placeholder-value");
 * ```
 *
 * #### Set the value of the secret
 *
 * You can then set the value of a secret using the [CLI](/docs/reference/cli/).
 *
 * ```sh title="Terminal"
 * sst secret set MySecret my-secret-value
 * ```
 *
 * :::note
 * If you are not running `sst dev`, you'll need to `sst deploy` to apply the secret.
 * :::
 *
 * #### Set a fallback for the secret
 *
 * You can set a _fallback_ value for the secret with the `--fallback` flag. If the secret is
 * not set for a stage, it'll use the fallback value instead.
 *
 * ```sh title="Terminal"
 * sst secret set MySecret my-fallback-value --fallback
 * ```
 *
 * This is useful for PR environments that are auto-deployed.
 *
 * #### Use the secret in your app config
 *
 * You can now use the secret in your app config.
 *
 * ```ts title="sst.config.ts"
 * console.log(mySecret.value);
 * ```
 *
 * #### Link the secret to a resource
 *
 * You can link the secret to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [secret]
 * });
 * ```
 *
 * Once linked, you can use the secret in your function code.
 *
 * ```ts title="app/page.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MySecret.value);
 * ```
 */
export class Secret extends Component implements Link.Linkable {
  private _value: string;
  private _name: string;
  private _placeholder?: string;

  /**
   * @param placeholder A placeholder value of the secret. This can be useful for cases where you might not be storing sensitive values.

   */
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
    if (typeof value !== "string") {
      throw new SecretMissingError(this._name);
    }
    this._value = value;
  }

  /**
   * The name of the secret.
   */
  public get name() {
    return output(this._name);
  }

  /**
   * The value of the secret. It'll be `undefined` if the secret has not been set through the CLI or if the `placeholder` hasn't been set.
   */
  public get value() {
    return secret(this._value);
  }

  /**
   * The placeholder value of the secret.
   */
  public get placeholder() {
    return output(this._placeholder);
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        value: this.value,
      },
    };
  }
}
