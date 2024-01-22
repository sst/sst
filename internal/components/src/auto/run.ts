import { PulumiFn } from "@pulumi/pulumi/automation";
import {
  initializeLinkRegistry,
  makeLinkable,
  makeAWSLinkable,
  isLinkable,
} from "../components/link";
import {
  ResourceTransformationArgs,
  interpolate,
  mergeOptions,
  runtime,
} from "@pulumi/pulumi";
import { Hint } from "./hint";

export async function run(program: PulumiFn) {
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

  runtime.registerStackTransformation((args: ResourceTransformationArgs) => {
    let normalizedName = args.name;
    if (
      args.type === "pulumi-nodejs:dynamic:Resource" ||
      args.type === "pulumi:providers:aws"
    ) {
      const parts = args.name.split(".");
      if (parts.length === 3 && parts[1] === "sst") {
        normalizedName = parts[0];
      }
    }

    if (!normalizedName.match(/^[A-Z][a-zA-Z0-9]*$/)) {
      throw new Error(
        `Invalid component name "${normalizedName}". Component names must start with an uppercase letter and contain only alphanumeric characters.`,
      );
    }

    return undefined;
  });

  await initializeLinkRegistry();
  makeLinkable(aws.dynamodb.Table, function () {
    return {
      type: `{ tableName: string }`,
      value: { tableName: this.name },
    };
  });
  makeAWSLinkable(aws.dynamodb.Table, function () {
    return {
      actions: ["dynamodb:*"],
      resources: [this.arn, interpolate`${this.arn}/*`],
    };
  });

  const links: Record<string, any> = {};
  runtime.registerStackTransformation((args) => {
    const resource = args.resource;
    process.nextTick(() => {
      if (isLinkable(resource)) {
        // Ensure linkable resources have unique names. This includes all
        // SST components and non-SST components that are linkable.
        if (links[args.name]) {
          throw new Error(
            `Invalid component name "${normalizedName}". Component names must start with an uppercase letter and contain only alphanumeric characters.`,
          );
        }

        const link = resource.getSSTLink();
        links[args.name] = link.value;
      }
    });
    return {
      opts: args.opts,
      props: args.props,
    };
  });

  Hint.reset();
  const outputs = (await program()) || {};
  outputs._links = links;
  outputs._hints = Hint.list();
  return outputs;
}
