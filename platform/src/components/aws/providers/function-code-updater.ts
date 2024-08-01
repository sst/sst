import { CustomResourceOptions, Input, Output, dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";

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

export interface FunctionCodeUpdater {
  version: Output<string>;
}

export class FunctionCodeUpdater extends dynamic.Resource {
  constructor(
    name: string,
    args: FunctionCodeUpdaterInputs,
    opts?: CustomResourceOptions,
  ) {
    super(
      new rpc.Provider("Aws.FunctionCodeUpdater"),
      `${name}.sst.aws.FunctionCodeUpdater`,
      { ...args, version: undefined },
      opts,
    );
  }
}
