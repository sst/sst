import { Link } from "../components/link";
import {
  ResourceTransformationArgs,
  interpolate,
  mergeOptions,
  runtime,
  automation,
  output,
} from "@pulumi/pulumi";

import { VisibleError } from "../components/error";
import { linkable as awsLinkable } from "../components/aws";
import { dynamodb } from "@pulumi/aws";

export async function run(program: automation.PulumiFn) {
  process.chdir($cli.paths.root);

  addTransformationToRetainResourcesOnDelete();
  addTransformationToEnsureUniqueComponentNames();
  addTransformationToCheckBucketsHaveMultiplePolicies();

  Link.makeLinkable(dynamodb.Table, (db) => {
    return {
      properties: { tableName: db.name },
    };
  });
  awsLinkable(dynamodb.Table, function (item) {
    return [
      {
        actions: ["dynamodb:*"],
        resources: [item.arn, interpolate`${item.arn}/*`],
      },
    ];
  });
  Link.reset();
  const outputs = (await program()) || {};
  return outputs;
}

function addTransformationToRetainResourcesOnDelete() {
  runtime.registerStackTransformation((args: ResourceTransformationArgs) => {
    if (
      $app.removal === "retain-all" ||
      ($app.removal === "retain" &&
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
}

function addTransformationToEnsureUniqueComponentNames() {
  const componentNames = new Set<string>();
  runtime.registerStackTransformation((args: ResourceTransformationArgs) => {
    if (args.type.startsWith("pulumi")) {
      return;
    }

    const lcName = args.name.toLowerCase();
    if (lcName === "app") {
      throw new VisibleError(
        `Component name "${args.name}" is reserved. Please choose a different name for your "${args.type}" component.`,
      );
    }

    if (componentNames.has(lcName)) {
      throw new VisibleError(
        `Invalid component name "${args.name}". Component names must be unique.`,
      );
    }
    componentNames.add(lcName);

    if (!args.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
      throw new VisibleError(
        `Invalid component name "${args.name}". Component names must start with an uppercase letter and contain only alphanumeric characters.`,
      );
    }

    return undefined;
  });
}

function addTransformationToCheckBucketsHaveMultiplePolicies() {
  const bucketsWithPolicy: Record<string, string> = {};
  runtime.registerStackTransformation((args: ResourceTransformationArgs) => {
    if (args.type !== "aws:s3/bucketPolicy:BucketPolicy") return;

    output(args.props.bucket).apply((bucket: string) => {
      if (bucketsWithPolicy[bucket])
        throw new VisibleError(
          `Cannot add bucket policy "${args.name}" to the AWS S3 Bucket "${bucket}". The bucket already has a policy attached "${bucketsWithPolicy[bucket]}".`,
        );

      bucketsWithPolicy[bucket] = args.name;
    });

    return undefined;
  });
}
