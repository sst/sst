import { CloudAssembly } from "aws-cdk-lib/cx-api";
import { Logger } from "../logger/index.js";
import { Stacks } from "../stacks/index.js";

interface DeployOpts {
  from?: string;
}

export async function Deploy(opts: DeployOpts) {
  const assembly = await (async function() {
    if (opts.from) {
      const result = new CloudAssembly(opts.from);
      return result;
    }

    const fn = await Stacks.build();
    return await Stacks.synth({
      fn
    });
  })();

  for (const stack of assembly.stacks) {
    try {
      await Stacks.deploy(stack);
    } catch (ex) {}
  }
}
