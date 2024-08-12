import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
import { rpc } from "../rpc/rpc.js";

export interface RunInputs {
  command: Input<string>;
  cwd: Input<string>;
  env: Input<Record<string, string>>;
  version: Input<string>;
}

export class Run extends dynamic.Resource {
  constructor(name: string, args: RunInputs, opts?: CustomResourceOptions) {
    super(new rpc.Provider("Run"), `${name}.sst.Run`, args, opts);
  }
}
