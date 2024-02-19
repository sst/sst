import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";

export interface StateInputs {
  state: Input<Inputs["state"]>;
}

interface Inputs {
  state: any;
}

interface Outputs {
  state: any;
}

export interface State {
  hasDeployed: Output<Outputs["state"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult> {
    return {
      id: "state",
      outs: inputs,
    };
  }

  async update(
    id: string,
    olds: Outputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult> {
    return {
      outs: news,
    };
  }
}

export class State extends dynamic.Resource {
  constructor(name: string, args: StateInputs, opts?: CustomResourceOptions) {
    super(new Provider(), `${name}.sst.aws.State`, args, opts);
  }
}
