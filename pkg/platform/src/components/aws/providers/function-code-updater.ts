import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
  LambdaClient,
  UpdateFunctionCodeCommand,
} from "@aws-sdk/client-lambda";
import { useClient } from "../helpers/client.js";

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
  region: Input<string>;
}

interface Inputs {
  s3Bucket: string;
  s3Key: string;
  functionName: string;
  functionLastModified: string;
  region: string;
}

interface Outputs {
  version: string;
}

export interface FunctionCodeUpdater {
  version: Output<Outputs["version"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    const client = useClient(LambdaClient, {
      region: inputs.region,
      retrableErrors: [
        // Lambda is not ready to accept updates right after creation
        "ServiceException",
      ],
    });
    const ret = await client.send(
      new UpdateFunctionCodeCommand({
        FunctionName: inputs.functionName,
        S3Bucket: inputs.s3Bucket,
        S3Key: inputs.s3Key,
      }),
    );
    return {
      id: inputs.functionName,
      outs: { version: ret.Version ?? "unknown" },
    };
  }

  async update(
    id: string,
    olds: any,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Outputs>> {
    const client = useClient(LambdaClient, {
      region: news.region,
      retrableErrors: [
        // Lambda is not ready to accept updates right after creation
        "ServiceException",
      ],
    });
    const ret = await client.send(
      new UpdateFunctionCodeCommand({
        FunctionName: news.functionName,
        S3Bucket: news.s3Bucket,
        S3Key: news.s3Key,
      }),
    );
    return { outs: { version: ret.Version ?? "unknown" } };
  }
}

export class FunctionCodeUpdater extends dynamic.Resource {
  constructor(
    name: string,
    args: FunctionCodeUpdaterInputs,
    opts?: CustomResourceOptions,
  ) {
    super(new Provider(), `${name}.sst.aws.FunctionCodeUpdater`, args, opts);
  }
}
