import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
import {
  Route53Client,
  ListHostedZonesCommand,
  ListHostedZonesCommandOutput,
} from "@aws-sdk/client-route-53";
import { useClient } from "../helpers/client.js";

interface Inputs {
  domain: string;
}

interface Outputs {
  zoneId: string;
}

export interface HostedZoneLookupInputs {
  domain: Input<Inputs["domain"]>;
}

export interface HostedZoneLookup {
  zoneId: Output<Outputs["zoneId"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    const zoneId = await this.lookup(inputs.domain);
    return { id: zoneId, outs: { zoneId } };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Outputs>> {
    const zoneId = await this.lookup(news.domain);
    return { outs: { zoneId } };
  }

  async lookup(domain: string) {
    const client = useClient(Route53Client);

    // Get all hosted zones in the account
    const zones: ListHostedZonesCommandOutput["HostedZones"] = [];
    let nextMarker: string | undefined;
    do {
      const res = await client.send(
        new ListHostedZonesCommand({ Marker: nextMarker }),
      );
      zones.push(...(res.HostedZones || []));
      nextMarker = res.NextMarker;
    } while (nextMarker);

    // Split zoneName by "." and try to find the longest matching zone
    // ie. for "my.app.domain.com"
    //     try "my.app.domain.com", "app.domain.com", "domain.com
    const parts = domain.split(".");
    for (let i = 0; i <= parts.length - 2; i++) {
      const zone = zones.find((z) => z.Name === parts.slice(i).join(".") + ".");
      if (zone?.Id) {
        return zone.Id.replace("/hostedzone/", "");
      }
    }

    throw new Error(`Could not find hosted zone for domain ${domain}`);
  }
}

export class HostedZoneLookup extends dynamic.Resource {
  constructor(
    name: string,
    args: HostedZoneLookupInputs,
    opts?: CustomResourceOptions,
  ) {
    super(
      new Provider(),
      `${name}.sst.aws.HostedZoneLookup`,
      { ...args, zoneId: undefined },
      opts,
    );
  }
}
