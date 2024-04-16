/**
 * The Cloudflare DNS Adapter lets you manage DNS records for domains hosted on [Cloudflare DNS]](https://developers.cloudflare.com/dns/).
 *
 * This component looks up the zone for the domain and creates the DNS records.
 *
 * @example
 *
 * ```ts
 * sst.cloudflare.dns();
 * ```
 *
 * Specify the zone ID.
 *
 * ```ts
 * sst.cloudflare.dns({
 *   zone: "415e6f4653b6d95b775d350f32119abb"
 * });
 * ```
 *
 * @packageDocumentation
 */

import * as cloudflare from "@pulumi/cloudflare";
import { Dns, Record } from "../dns";
import { sanitizeToPascalCase } from "../naming";
import { ZoneLookup } from "./providers/zone-lookup";
import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import { Transform, transform } from "../component";
import { Input } from "../input";

export interface DnsArgs {
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

/**
 * @param args The DNS arguments.
 */
export function dns(args: DnsArgs = {}) {
  return {
    provider: "cloudflare",
    createRecord,
  } satisfies Dns;

  function createRecord(
    namePrefix: string,
    record: Record,
    opts: ComponentResourceOptions,
  ) {
    return output(record).apply((record) => {
      const nameSuffix = sanitizeToPascalCase(record.name);
      const zoneId = lookupZone();
      const dnsRecord = createRecord();
      return dnsRecord;

      function lookupZone() {
        if (args.zone) return args.zone;

        return new ZoneLookup(
          `${namePrefix}${record.type}ZoneLookup${nameSuffix}`,
          {
            accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
            domain: output(record.name).apply((name) =>
              name.replace(/\.$/, ""),
            ),
          },
          opts,
        ).id;
      }

      function createRecord() {
        return new cloudflare.Record(
          `${namePrefix}${record.type}Record${nameSuffix}`,
          transform(args.transform?.record, {
            zoneId,
            name: record.name,
            value: record.value,
            type: record.type,
            ttl: 60,
          }),
          opts,
        );
      }
    });
  }
}
