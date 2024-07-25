import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
import {
  CloudFrontClient,
  GetDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import { useClient } from "../helpers/client.js";

export interface DistributionDeploymentWaiterInputs {
  distributionId: Input<Inputs["distributionId"]>;
  etag: Input<Inputs["etag"]>;
  wait: Input<Inputs["wait"]>;
}

interface Inputs {
  distributionId: string;
  etag: string;
  wait: boolean;
}

interface Outputs {
  isDone: boolean;
}

export interface DistributionDeploymentWaiter {
  isDone: Output<Outputs["isDone"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    await this.handle(inputs);
    return { id: "waiter", outs: { isDone: true } };
  }

  async update(
    id: string,
    olds: any,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Outputs>> {
    await this.handle(news);
    return { outs: { isDone: true } };
  }

  async handle(inputs: Inputs) {
    if (!inputs.wait) return;

    const { distributionId } = inputs;
    const client = useClient(CloudFrontClient);
    const start = Date.now();

    do {
      const result = await client.send(
        new GetDistributionCommand({
          Id: distributionId,
        }),
      );
      if (result.Distribution?.Status === "Deployed") return;

      // wait for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // timeout after 5 minutes
    } while (Date.now() - start < 300000);
  }
}

export class DistributionDeploymentWaiter extends dynamic.Resource {
  constructor(
    name: string,
    args: DistributionDeploymentWaiterInputs,
    opts?: CustomResourceOptions,
  ) {
    super(
      new Provider(),
      `${name}.sst.aws.DistributionDeploymentWaiter`,
      args,
      opts,
    );
  }
}
