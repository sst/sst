import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
import {
  LambdaClient,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
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
    const version = await this.updateCode(inputs);
    await this.waitForUpdate(inputs);
    return {
      id: inputs.functionName,
      outs: { version },
    };
  }

  async update(
    _id: string,
    _olds: any,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Outputs>> {
    const version = await this.updateCode(news);
    await this.waitForUpdate(news);
    return { outs: { version } };
  }

  async updateCode(inputs: Inputs) {
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
    return ret.Version ?? "unknown";
  }

  async waitForUpdate(inputs: Inputs): Promise<void> {
    const client = useClient(LambdaClient, {
      region: inputs.region,
      retrableErrors: [
        // Lambda is not ready to accept updates right after creation
        "ServiceException",
      ],
    });
    const ret = await client.send(
      new GetFunctionCommand({
        FunctionName: inputs.functionName,
      }),
    );
    if (ret.Configuration?.LastUpdateStatus === "Successful") return;

    if (ret.Configuration?.LastUpdateStatus === "Failed") {
      throw new Error(
        `Failed to update function ${ret.Configuration.LastUpdateStatusReasonCode}: ${ret.Configuration.LastUpdateStatusReason}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    return this.waitForUpdate(inputs);
  }
}

export class FunctionCodeUpdater extends dynamic.Resource {
  constructor(
    name: string,
    args: FunctionCodeUpdaterInputs,
    opts?: CustomResourceOptions,
  ) {
    super(
      new Provider(),
      `${name}.sst.aws.FunctionCodeUpdater`,
      { ...args, version: undefined },
      opts,
    );
  }
}
