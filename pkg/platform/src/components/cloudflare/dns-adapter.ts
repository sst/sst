import * as cloudflare from "@pulumi/cloudflare";
import {
  DnsAdapter as BaseDnsAdapter,
  Record as BaseRecord,
} from "../base/dns-adapter";
import { sanitizeToPascalCase } from "../naming";
import { ZoneLookup } from "./providers/zone-lookup";
import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Input } from "../input";

export interface DnsAdapterArgs {
  /**
   * The ID of the Cloudflare zone to create the record in.
   *
   * @example
   * ```js
   * {
   *   zone: "415e6f4653b6d95b775d350f32119abb"
   * }
   * ```
   */
  zone?: Input<string>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cloudflare record resource.
     */
    record?: Transform<cloudflare.RecordArgs>;
  };
}

export interface Record extends BaseRecord {}

/**
 * The Cloudflare `DnsAdapters` lets you manage DNS records for domains hosted on [Cloudflare DNS]](https://developers.cloudflare.com/dns/).
 *
 * This component looks up the zone for the domain and creates the DNS records.
 *
 * @example
 *
 * ```ts
 * new sst.cloudflare.DnsAdapter("MyDns");
 * ```
 *
 * Specify the zone ID.
 *
 * ```ts
 * new sst.cloudflare.DnsAdapter("MyDns", {
 *   zone: "415e6f4653b6d95b775d350f32119abb"
 * });
 * ```
 */
export class DnsAdapter extends Component implements BaseDnsAdapter {
  private name: string;
  private args: DnsAdapterArgs;

  constructor(
    name: string,
    args: DnsAdapterArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    this.name = name;
    this.args = args;
  }

  createRecord(record: Record) {
    const parent = this;
    const args = this.args;
    const namePrefix = this.name;

    return output(record).apply((record) => {
      const nameSuffix = sanitizeToPascalCase(`${record.type}${record.name}`);
      const zoneId = lookupZone();
      const dnsRecord = createRecord();
      return dnsRecord;

      function lookupZone() {
        if (args.zone) return args.zone;

        return new ZoneLookup(
          `${namePrefix}ZoneLookup${nameSuffix}`,
          {
            accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
            domain: output(record.name).apply((name) =>
              name.replace(/\.$/, ""),
            ),
          },
          { parent },
        ).id;
      }

      function createRecord() {
        return new cloudflare.Record(
          `${namePrefix}Record${nameSuffix}`,
          transform(args.transform?.record, {
            zoneId,
            name: record.name,
            value: record.value,
            type: record.type,
            ttl: 60,
            allowOverwrite: true,
          }),
          { parent },
        );
      }
    });
  }
}

const __pulumiType = "sst:cloudflare:DnsAdapter";
// @ts-expect-error
DnsAdapter.__pulumiType = __pulumiType;
