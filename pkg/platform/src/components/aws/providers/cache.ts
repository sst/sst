import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";

export interface CacheInputs {
  data: Input<Inputs["data"]>;
}

interface Inputs {
  data: any;
}

export interface Cache {
  data: Output<Inputs["data"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Inputs>> {
    return {
      id: "cache",
      outs: {
        data: inputs.data,
      },
    };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Inputs>> {
    return {
      outs: {
        data: news.data,
      },
    };
  }
}

export class Cache extends dynamic.Resource {
  constructor(name: string, args: CacheInputs, opts?: CustomResourceOptions) {
    super(new Provider(), `${name}.sst.aws.Cache`, args, opts);
  }
}
