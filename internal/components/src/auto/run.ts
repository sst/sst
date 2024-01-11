import { PulumiFn } from "@pulumi/pulumi/automation";
import { runtime } from "@pulumi/pulumi";
import { initializeLinkRegistry } from "../components/link";

export async function run(program: PulumiFn) {
  process.chdir($cli.paths.root);

  runtime.registerStackTransformation(
    (args: util.ResourceTransformationArgs) => {
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
          opts: util.mergeOptions({ retainOnDelete: true }, args.opts),
        };
      }
      return undefined;
    },
  );

  runtime.registerStackTransformation(
    (args: util.ResourceTransformationArgs) => {
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
    },
  );

  await initializeLinkRegistry();
  return await program();
}
