import { LocalWorkspace } from "@pulumi/pulumi/automation/index.js";
import { runtime } from "@pulumi/pulumi";
import { PulumiFn } from "@pulumi/pulumi/automation";

export async function run(program: PulumiFn) {
  const config: Record<string, { value: string }> = {};
  for (const [provider, args] of Object.entries($app.providers || {})) {
    for (const [key, value] of Object.entries(args)) {
      config[provider + ":" + key] = { value };
    }
  }

  config["aws:defaultTags"] = {
    value: JSON.stringify({
      tags: {
        ...$app.providers?.aws?.defaultTags,
        "sst:app": $app.name,
        "sst:stage": $app.stage,
      },
    }),
  };

  const removalPolicyTransform = (args: util.ResourceTransformationArgs) => {
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
  };

  const validateNamesTransform = (args: util.ResourceTransformationArgs) => {
    if (!args.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
      throw new Error(
        `Invalid component name "${args.name}". Component names must start with an uppercase letter and contain only alphanumeric characters.`
      );
    }

    return undefined;
  };

  const stack = await LocalWorkspace.createOrSelectStack(
    {
      program: async () => {
        runtime.registerStackTransformation(removalPolicyTransform);
        runtime.registerStackTransformation(validateNamesTransform);

        return program();
      },
      projectName: $app.name,
      stackName: $app.stage,
    },
    {
      pulumiHome: $cli.paths.home,
      projectSettings: {
        main: $cli.paths.root,
        name: $app.name,
        runtime: "nodejs",
        backend: {
          url: "s3://" + $cli.backend,
        },
      },
      envVars: {
        PULUMI_CONFIG_PASSPHRASE: "",
        PULUMI_SKIP_UPDATE_CHECK: "true",
        PULUMI_EXPERIMENTAL: "1",
        PULUMI_SKIP_CHECKPOINTS: "true",
        NODE_PATH: $cli.paths.work + "/node_modules",
        ...$cli.env,
      },
    }
  );
  await stack.setAllConfig(config);

  try {
    await stack[$cli.command as "up"]({
      onEvent: (evt) => {
        console.log("~j" + JSON.stringify(evt));
      },
    });
  } catch (e: any) {
    if (e.name === "ConcurrentUpdateError") {
      console.log("~j" + JSON.stringify({ ConcurrentUpdateEvent: {} }));
    }
  }
}
