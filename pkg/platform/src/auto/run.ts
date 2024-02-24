import { Link } from "../components/link";
import { Hint } from "../components/hint";
import { Warp } from "../components/warp";
import {
  ResourceTransformationArgs,
  interpolate,
  mergeOptions,
  runtime,
  automation,
} from "@pulumi/pulumi";

import aws from "@pulumi/aws";
import { VisibleError } from "../components/error";

export async function run(program: automation.PulumiFn) {
  process.chdir($cli.paths.root);

  runtime.registerStackTransformation((args: ResourceTransformationArgs) => {
    if (
      $app.removalPolicy === "retain-all" ||
      ($app.removalPolicy === "retain" &&
        [
          "aws:s3/bucket:Bucket",
          "aws:s3/bucketV2:BucketV2",
          "aws:dynamodb/table:Table",
        ].includes(args.type))
    ) {
      return {
        props: args.props,
        opts: mergeOptions({ retainOnDelete: true }, args.opts),
      };
    }
    return undefined;
  });

  const componentNames = new Set<string>();
  runtime.registerStackTransformation((args: ResourceTransformationArgs) => {
    if (args.type.startsWith("pulumi")) {
      return;
    }

    if (componentNames.has(args.name)) {
      throw new VisibleError(
        `Invalid component name "${args.name}". Component names must be unique.`,
      );
    }
    componentNames.add(args.name);

    if (!args.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
      throw new Error(
        `Invalid component name "${args.name}". Component names must start with an uppercase letter and contain only alphanumeric characters.`,
      );
    }

    return undefined;
  });

  Link.makeLinkable(aws.dynamodb.Table, function () {
    return {
      properties: { tableName: this.name },
    };
  });
  Link.AWS.makeLinkable(aws.dynamodb.Table, function () {
    return [
      {
        actions: ["dynamodb:*"],
        resources: [this.arn, interpolate`${this.arn}/*`],
      },
    ];
  });

  Hint.reset();
  Link.reset();
  Warp.reset();
  const outputs = (await program()) || {};
  outputs._links = Link.list();
  outputs._hints = Hint.list();
  outputs._warps = Warp.list();
  outputs._receivers = Link.Receiver.list();
  return outputs;
}
