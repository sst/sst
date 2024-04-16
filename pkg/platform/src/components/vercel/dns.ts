/**
 * The Vercel DNS Adapter lets you manage DNS records for [Vercel](http://vercel.com) domains.
 *
 * @example
 *
 * ```ts
 * sst.vercel.dns({
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
 *
 * @packageDocumentation
 */

import * as vercel from "@pulumiverse/vercel";
import { Dns, Record } from "../dns";
import { sanitizeToPascalCase } from "../naming";
import { ComponentResourceOptions, all } from "@pulumi/pulumi";
import { Transform, transform } from "../component";
import { Input } from "../input";

export interface DnsArgs {
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

/**
 * @param args The DNS arguments.
 */
export function dns(args: DnsArgs) {
  let caaRecord: vercel.DnsRecord;
  return {
    provider: "vercel",
    createRecord,
  } satisfies Dns;

  function useCAARecord(namePrefix: string, opts: ComponentResourceOptions) {
    if (!caaRecord) {
      caaRecord = new vercel.DnsRecord(
        `${namePrefix}CAARecord`,
        transform(args.transform?.record, {
          domain: args.domain,
          type: "CAA",
          name: "",
          value: `0 issue "amazonaws.com"`,
          teamId: sst.vercel.DEFAULT_TEAM_ID,
        }),
        opts,
      );
    }
    return caaRecord;
  }

  function createRecord(
    namePrefix: string,
    record: Record,
    opts: ComponentResourceOptions,
  ) {
    return all([args.domain, record]).apply(([domain, record]) => {
      const nameSuffix = sanitizeToPascalCase(record.name);
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
          `${namePrefix}${record.type}Record${nameSuffix}`,
          transform(args.transform?.record, {
            domain: args.domain,
            type: record.type,
            name: recordName,
            value: record.value,
            teamId: sst.vercel.DEFAULT_TEAM_ID,
            ttl: 60,
          }),
          { ...opts, dependsOn: [useCAARecord(namePrefix, opts)] },
        );
      }
    });
  }
}
