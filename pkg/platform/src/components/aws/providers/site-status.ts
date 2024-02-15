import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";

export interface SiteStatusInputs {
  mode: Input<Inputs["mode"]>;
}

interface Inputs {
  mode: "dev" | "deploy";
}

interface Outputs {
  hasDeployed: boolean;
}

export interface SiteStatus {
  hasDeployed: Output<Outputs["hasDeployed"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult> {
    return {
      id: "status",
      outs: {
        hasDeployed: inputs.mode === "deploy",
      },
    };
  }

  async update(
    id: string,
    olds: Outputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult> {
    return {
      outs: {
        hasDeployed: olds.hasDeployed || news.mode === "deploy",
      },
    };
  }
}

export class SiteStatus extends dynamic.Resource {
  constructor(
    name: string,
    args: SiteStatusInputs,
    opts?: CustomResourceOptions,
  ) {
    super(new Provider(), `${name}.sst.aws.SiteStatus`, args, opts);
  }
}
