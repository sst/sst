import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
import {
  CloudFrontClient,
  GetCloudFrontOriginAccessIdentityCommand,
  CreateCloudFrontOriginAccessIdentityCommand,
  DeleteCloudFrontOriginAccessIdentityCommand,
} from "@aws-sdk/client-cloudfront";
import { useClient } from "../helpers/client.js";

interface Inputs {}

interface Outputs {}

export interface OriginAccessIdentityInputs {}

export interface OriginAccessIdentity {}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    const client = useClient(CloudFrontClient);

    const ret = await client.send(
      new CreateCloudFrontOriginAccessIdentityCommand({
        CloudFrontOriginAccessIdentityConfig: {
          CallerReference: Date.now().toString(),
          Comment: "Created by SST",
        },
      }),
    );
    const id = ret.CloudFrontOriginAccessIdentity?.Id!;

    return { id, outs: {} };
  }

  async delete(id: string, outs: Outputs): Promise<void> {
    const client = useClient(CloudFrontClient);

    const ret = await client.send(
      new GetCloudFrontOriginAccessIdentityCommand({ Id: id }),
    );

    await client.send(
      new DeleteCloudFrontOriginAccessIdentityCommand({
        Id: id,
        IfMatch: ret.ETag,
      }),
    );
  }
}

export class OriginAccessIdentity extends dynamic.Resource {
  constructor(
    name: string,
    args: OriginAccessIdentityInputs,
    opts?: CustomResourceOptions,
  ) {
    super(new Provider(), `${name}.sst.aws.OriginAccessIdentity`, args, opts);
  }
}
