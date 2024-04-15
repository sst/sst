import * as aws from "@pulumi/aws";
import {
  DnsAdapter as BaseDnsAdapter,
  Record as BaseRecord,
} from "../base/dns-adapter";
import { sanitizeToPascalCase } from "../naming";
import { HostedZoneLookup } from "./providers/hosted-zone-lookup";
import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Input } from "../input";

export interface DnsAdapterArgs {
  /**
   * The 14 letter ID of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone ID in the Route 53 part of the AWS Console.
   *
   * This option is useful for cases where you have multiple hosted zones that have the same
   * domain.
   *
   * @example
   * ```js
   * {
   *   zone: "Z2FDTNDATAQYW2"
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
     * Transform the AWS Route 53 record resource.
     */
    record?: Transform<aws.route53.RecordArgs>;
  };
}

export interface Record extends BaseRecord {}
export interface AliasRecord {
  /**
   * The name of the record.
   */
  name: Input<string>;
  /**
   * The domain name for the alias target.
   */
  aliasName: Input<string>;
  /**
   * The Route 53 hosted zone ID for the alias target.
   */
  aliasZone: Input<string>;
}

/**
 * The AWS `DnsAdapters` lets you manage DNS records for domains hosted on [Route 53](https://aws.amazon.com/route53/).
 *
 * This component looks up the hosted zone for the domain and creates the DNS records.
 *
 * @example
 *
 * ```ts
 * new sst.aws.DnsAdapter("MyDns");
 * ```
 *
 * Specify the specific hosted zone ID if you have multiple hosted zones with the same domain.
 *
 * ```ts
 * new sst.aws.DnsAdapter("MyDns", {
 *   zone: "Z2FDTNDATAQYW2",
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

  /**
   * Creates a DNS record in the hosted zone.
   *
   * @param record The DNS record to create.
   */
  public createRecord(record: Record) {
    return this._createRecord({
      type: record.type,
      name: record.name,
      ttl: 60,
      records: [record.value],
    });
  }

  /**
   * Creates alias records in the hosted zone.
   *
   * @param record The alias record to create.
   */
  public createAliasRecords(record: AliasRecord) {
    return ["A", "AAAA"].map((type) =>
      this._createRecord({
        type,
        name: record.name,
        aliases: [
          {
            name: record.aliasName,
            zoneId: record.aliasZone,
            evaluateTargetHealth: true,
          },
        ],
      }),
    );
  }

  private _createRecord(partial: Omit<aws.route53.RecordArgs, "zoneId">) {
    const parent = this;
    const args = this.args;
    const namePrefix = this.name;

    return output(partial).apply((partial) => {
      const nameSuffix = sanitizeToPascalCase(`${partial.type}${partial.name}`);
      const zoneId = lookupZone();
      const dnsRecord = createRecord();
      return dnsRecord;

      function lookupZone() {
        if (args.zone) return args.zone;

        return new HostedZoneLookup(
          `${namePrefix}ZoneLookup${nameSuffix}`,
          {
            domain: output(partial.name!).apply((name) =>
              name.replace(/\.$/, ""),
            ),
          },
          { parent },
        ).zoneId;
      }

      function createRecord() {
        return new aws.route53.Record(
          `${namePrefix}Record${nameSuffix}`,
          transform(args.transform?.record, {
            zoneId,
            allowOverwrite: true,
            ...partial,
          }),
          { parent },
        );
      }
    });
  }
}

const __pulumiType = "sst:aws:DnsAdapter";
// @ts-expect-error
DnsAdapter.__pulumiType = __pulumiType;
