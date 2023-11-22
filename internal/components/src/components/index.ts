export * from "./nextjs";

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

class Provider implements pulumi.dynamic.ResourceProvider {
  async create(): Promise<pulumi.dynamic.CreateResult> {
    const client = new STSClient();
    const identity = await client.send(new GetCallerIdentityCommand({}));
    return { id: "foo", outs: { account: identity.Account } };
  }
}

export class FunctionCodeUpdater extends pulumi.dynamic.Resource {
  account!: pulumi.Output<string>;
  constructor(name: string) {
    super(new Provider(), name, { account: undefined });
  }
}
