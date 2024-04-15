import { Output, Resource } from "@pulumi/pulumi";
import { Input } from "../input";
import { DnsAdapter as AwsDnsAdapter } from "../aws/dns-adapter";
import { DnsAdapter as CloudflareDnsAdapter } from "../cloudflare/dns-adapter";

export interface Record {
  /**
   * The name of the record.
   */
  name: Input<string>;
  /**
   * The type of the record.
   */
  type: Input<string>;
  /**
   * The value of the record.
   */
  value: Input<string>;
}

export type DnsAdapterInput = false | AwsDnsAdapter | CloudflareDnsAdapter;

export interface DnsAdapter {
  createRecord: (record: Record) => Output<Resource>;
}
