import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import { Component } from "../component";
import { DevArgs } from "../dev.js";
import { Link } from "../link.js";
import { Input } from "../input";

interface DevCommandArgs {
  dev?: DevArgs["dev"];
  link?: Input<any[]>;
  environment?: Input<Record<string, Input<string>>>;
  aws?: {
    role: Input<string>;
  };
}
export class DevCommand extends Component {
  constructor(
    name: string,
    args: DevCommandArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    this.registerOutputs({
      _dev: {
        links: output(args.link || [])
          .apply(Link.build)
          .apply((links) => links.map((link) => link.name)),
        environment: args.environment,
        directory: args.dev?.directory,
        autostart: args.dev?.autostart,
        command: args.dev?.command,
        aws: {
          role: args.aws?.role,
        },
      },
    });
  }
}

const __pulumiType = "sst:sst:DevCommand";
// @ts-expect-error
DevCommand.__pulumiType = __pulumiType;
