import * as vercel from "@pulumiverse/vercel";
import {
  DnsAdapter as BaseDnsAdapter,
  Record as BaseRecord,
} from "../base/dns-adapter";
import { sanitizeToPascalCase } from "../naming";
import { ComponentResourceOptions, all } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Input } from "../input";

export interface DnsAdapterArgs {
  /**
   * The domain name in your Vercel account to create the record in.
   *
   * @example
   * ```js
   * {
   *   domain: "example.com"
   * }
   * ```
   */
  domain: Input<string>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Vercel record resource.
     */
    record?: Transform<vercel.DnsRecordArgs>;
  };
}

export interface Record extends BaseRecord {}

/**
 * The Vercel `DnsAdapters` lets you manage DNS records for [Vercel](http://vercel.com) domains.
 *
 * @example
 *
 * ```ts
 * new sst.vercel.DnsAdapter("MyDns", {
 *   domain: "example.com"
 * });
 * ```
 *
 * #### Configuring Vercel provider
 * 1. To use this component, add the `@pulumiverse/vercel` provider to your app. You can do this by running:
 *
 *    ```bash
 *    sst add @pulumiverse/vercel
 *    ```
 *
 *    The [`sst add`](/docs/reference/cli/#add) commands adds and installs the provider to your `sst.config.ts` file.
 *
 * 2. If you don't already have a Vercel Access Token, follow [this guide](https://vercel.com/guides/how-do-i-use-a-vercel-api-access-token#creating-an-access-token) to create one.
 *
 * 3. Add a `VERCEL_API_TOKEN` environment variable with the access token value. If the domain
 * belongs to a team, also add a `VERCEL_TEAM_ID` environment variable with the Team ID. You can
 * find your Team ID inside your team's general project settings on the Vercel dashboard.
 */
export class DnsAdapter extends Component implements BaseDnsAdapter {
  private name: string;
  private args: DnsAdapterArgs;
  private caaRecord?: vercel.DnsRecord;

  constructor(
    name: string,
    args: DnsAdapterArgs,
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    this.name = name;
    this.args = args;
  }

  private useCAARecord() {
    if (!this.caaRecord) {
      const args = this.args;
      const namePrefix = this.name;

      this.caaRecord = new vercel.DnsRecord(
        `${namePrefix}CAARecord`,
        transform(args.transform?.record, {
          domain: args.domain,
          type: "CAA",
          name: "",
          value: `0 issue "amazonaws.com"`,
          teamId: sst.vercel.DEFAULT_TEAM_ID,
        }),
        { parent: this },
      );
    }
    return this.caaRecord;
  }

  createRecord(record: Record) {
    const parent = this;
    const args = this.args;
    const namePrefix = this.name;

    return all([args.domain, record]).apply(([domain, record]) => {
      const nameSuffix = sanitizeToPascalCase(`${record.type}${record.name}`);
      const recordName = validateRecordName();
      const dnsRecord = createRecord();
      return dnsRecord;

      function validateRecordName() {
        const recordName = record.name.replace(/\.$/, "");
        if (!recordName.endsWith(domain))
          throw new Error(
            `Record name "${recordName}" is not a subdomain of "${domain}".`,
          );
        return recordName.slice(0, -(domain.length + 1));
      }

      function createRecord() {
        return new vercel.DnsRecord(
          `${namePrefix}Record${nameSuffix}`,
          transform(args.transform?.record, {
            domain: args.domain,
            type: record.type,
            name: recordName,
            value: record.value,
            teamId: sst.vercel.DEFAULT_TEAM_ID,
            ttl: 60,
          }),
          { parent, dependsOn: [parent.useCAARecord()] },
        );
      }
    });
  }
}

const __pulumiType = "sst:vercel:DnsAdapter";
// @ts-expect-error
DnsAdapter.__pulumiType = __pulumiType;
