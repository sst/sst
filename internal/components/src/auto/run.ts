import { PulumiFn } from "@pulumi/pulumi/automation";
import { runtime } from "@pulumi/pulumi";

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
    }
  );
  runtime.registerStackTransformation(
    (args: util.ResourceTransformationArgs) => {
      let normalizedName = args.name;

      if (args.type === "pulumi:providers:aws") {
        const parts = args.name.split(".");
        if (
          parts.length === 3 &&
          parts[0] === "AwsProvider" &&
          parts[1] === "sst"
        ) {
          normalizedName = parts[0];
        }
      }

      if (args.type === "pulumi-nodejs:dynamic:Resource") {
        const parts = args.name.split(".");
        if (parts.length === 3 && parts[1] === "sst") {
          normalizedName = parts[0];
        }
      }

      if (!normalizedName.match(/^[A-Z][a-zA-Z0-9]*$/)) {
        throw new Error(
          `Invalid component name "${normalizedName}". Component names must start with an uppercase letter and contain only alphanumeric characters.`
        );
      }

      return undefined;
    }
  );

  const results = await program();
  return results;

  // const stack = await LocalWorkspace.createOrSelectStack(
  //   {
  //     program: async () => {
  //       runtime.registerStackTransformation(removalPolicyTransform);
  //       runtime.registerStackTransformation(validateNamesTransform);

  //       return program();
  //     },
  //     projectName: $app.name,
  //     stackName: $app.stage,
  //   },
  //   {
  //     pulumiHome: $cli.paths.home,
  //     projectSettings: {
  //       main: $cli.paths.root,
  //       name: $app.name,
  //       runtime: "nodejs",
  //       backend: {
  //         url: $cli.backend,
  //       },
  //     },
  //     envVars: {
  //       PULUMI_CONFIG_PASSPHRASE: "",
  //       PULUMI_SKIP_UPDATE_CHECK: "true",
  //       PULUMI_EXPERIMENTAL: "1",
  //       // PULUMI_SKIP_CHECKPOINTS: "true",
  //       NODE_PATH: $cli.paths.work + "/node_modules",
  //       ...$cli.env,
  //     },
  //   },
  // );

  // try {
  //   await stack[$cli.command as "up"]({
  //     onEvent: (evt) => {
  //       console.log("~j" + JSON.stringify(evt));
  //     },
  //     onOutput: console.log,
  //     logToStdErr: true,
  //     logVerbosity: 100,
  //   });
  // } catch (e: any) {
  //   if (e.name === "ConcurrentUpdateError") {
  //     console.log("~j" + JSON.stringify({ ConcurrentUpdateEvent: {} }));
  //   }
  // }
}
