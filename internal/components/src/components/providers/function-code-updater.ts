import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
import {
  LambdaClient,
  UpdateFunctionCodeCommand,
} from "@aws-sdk/client-lambda";
import { AWS } from "../helpers/aws.js";

export interface FunctionCodeUpdaterInputs {
  s3Bucket: Input<string>;
  s3Key: Input<string>;
  functionName: Input<string>;
  /**
   * This is to ensure the function code is re-updated when the function's
   * configuration changes. Without this, the function code might get reverted
   * back to the placeholder code.
   */
  functionLastModified: Input<string>;
  region: Input<aws.Region>;
}

interface Inputs {
  s3Bucket: string;
  s3Key: string;
  functionName: string;
  functionLastModified: string;
  region: aws.Region;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult> {
    const client = AWS.useClient(LambdaClient, { region: inputs.region });
    await client.send(
      new UpdateFunctionCodeCommand({
        FunctionName: inputs.functionName,
        S3Bucket: inputs.s3Bucket,
        S3Key: inputs.s3Key,
      })
    );
    return { id: inputs.functionName, outs: {} };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs
  ): Promise<dynamic.UpdateResult> {
    const client = AWS.useClient(LambdaClient, {
      region: news.region,
      retrableErrors: [
        // Lambda is not ready to accept updates right after creation
        "ServiceException",
      ],
    });
    await client.send(
      new UpdateFunctionCodeCommand({
        FunctionName: news.functionName,
        S3Bucket: news.s3Bucket,
        S3Key: news.s3Key,
      })
    );
    return { outs: {} };
  }
}

export class FunctionCodeUpdater extends dynamic.Resource {
  constructor(
    name: string,
    args: FunctionCodeUpdaterInputs,
    opts?: CustomResourceOptions
  ) {
    super(new Provider(), `${name}.sst.FunctionCodeUpdater`, args, opts);
  }
}
