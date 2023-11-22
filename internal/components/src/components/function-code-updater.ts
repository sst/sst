import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

class Provider implements util.dynamic.ResourceProvider {
  async create(): Promise<util.dynamic.CreateResult> {
    const client = new STSClient();
    const identity = await client.send(new GetCallerIdentityCommand({}));
    return { id: "foo", outs: { account: identity.Account } };
  }
}

export class FunctionCodeUpdater extends util.dynamic.Resource {
  account!: util.Output<string>;
  constructor(name: string) {
    super(new Provider(), name, { account: undefined });
  }
}

//const updater = new FunctionCodeUpdater("foo");
//export const account = updater.account;
