import pulumi from "@pulumi/pulumi";
import {
  LambdaClient,
  UpdateFunctionCodeCommand,
} from "@aws-sdk/client-lambda";

export interface FunctionCodeUpdaterInputs {
  s3Bucket: pulumi.Input<string>;
  s3Key: pulumi.Input<string>;
  functionName: pulumi.Input<string>;
}

interface Inputs {
  s3Bucket: string;
  s3Key: string;
  functionName: string;
}

class Provider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<pulumi.dynamic.CreateResult> {
    const client = new LambdaClient();
    await client.send(
      new UpdateFunctionCodeCommand({
        FunctionName: inputs.functionName,
        S3Bucket: inputs.s3Bucket,
        S3Key: inputs.s3Key,
      }),
    );
    return { id: "foo" };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs,
  ): Promise<pulumi.dynamic.UpdateResult> {
    const client = new LambdaClient();
    await client.send(
      new UpdateFunctionCodeCommand({
        FunctionName: news.functionName,
        S3Bucket: news.s3Bucket,
        S3Key: news.s3Key,
      }),
    );
    return {};
  }
}

export class FunctionCodeUpdater extends pulumi.dynamic.Resource {
  account!: pulumi.Output<string>;
  constructor(
    name: string,
    args: FunctionCodeUpdaterInputs,
    opts?: pulumi.CustomResourceOptions,
  ) {
    super(new Provider(), name, args, opts);
  }
}
