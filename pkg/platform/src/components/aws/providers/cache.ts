import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";

export interface CacheInputs {
  data: Input<Inputs["data"]>;
}

interface Inputs {
  data: any;
}

interface Outputs {
  data: any;
}

export interface Cache {
  data: Output<Outputs["data"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    return {
      id: "cache",
      outs: {
        data: inputs.data,
      },
    };
  }

  async update(
    id: string,
    olds: Outputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Outputs>> {
    return {
      outs: {
        data: news.data ?? olds.data,
      },
    };
  }
}

export class Cache extends dynamic.Resource {
  constructor(name: string, args: CacheInputs, opts?: CustomResourceOptions) {
    super(new Provider(), `${name}.sst.aws.Cache`, args, opts);
  }
}
