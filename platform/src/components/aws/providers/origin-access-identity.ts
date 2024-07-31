import { CustomResourceOptions, dynamic } from "@pulumi/pulumi";
import { rpc } from "../../rpc/rpc.js";

export interface OriginAccessIdentityInputs {}

export class OriginAccessIdentity extends dynamic.Resource {
  constructor(
    name: string,
    args: OriginAccessIdentityInputs,
    opts?: CustomResourceOptions,
  ) {
    super(
      new rpc.Provider("Aws.OriginAccessIdentity"),
      `${name}.sst.aws.OriginAccessIdentity`,
      args,
      opts,
    );
  }
}
