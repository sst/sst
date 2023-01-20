import type { Program } from "../program.js";

export const updateMod = (program: Program) =>
  program.command(
    "update-mod <transform>",
    "Transforms your SST app",
    (yargs) =>
      yargs.positional("transform", {
        type: "string",
        describe: "Name of the transform",
        demandOption: true,
      }),
    async (args) => {
      const { green } = await import("colorette");
      if (args.transform === "resource-binding-secrets") {
        await handleSecretsMigration();
      }
      console.log(
        green(`Update transform "${args.transform}" has been applied successfully!`)
      );
    }
  );

async function handleSecretsMigration() {
  const { useProject } = await import("../../project.js");
  const { useAWSClient } = await import("../../credentials.js");
  const { SSMClient, GetParametersByPathCommand, PutParameterCommand } = await import("@aws-sdk/client-ssm");
  const project = useProject();
  const { name: app, stage } = project.config;
  const ssm = useAWSClient(SSMClient);

  async function* getAllPrametersByPath(prefix: string) {
    let token: string | undefined;

    while (true) {
      const results = await ssm.send(
        new GetParametersByPathCommand({
          Path: prefix,
          WithDecryption: true,
          Recursive: true,
          NextToken: token,
        })
      );
      yield* results.Parameters || [];

      if (!results.NextToken) break;
      token = results.NextToken;
    }
  }

  async function migrateSecretsSSMPath(stage: string) {
    const oldPrefix = `/sst/${app}/${stage}/secrets/`;
    const newPrefix = `/sst/${app}/${stage}/Secret/`;

    for await (const secret of getAllPrametersByPath(oldPrefix)) {
      const name = secret.Name!.split("/")[5];
      // Do not migrate SST Auth secrets b/c they are no longer secrets in v1.16.
      if (name === "SST_AUTH_PRIVATE" || name === "SST_AUTH_PUBLIC") {
        continue;
      }
      await ssm.send(new PutParameterCommand({
        Name: `${newPrefix}${name}/value`,
        Value: secret.Value!,
        Type: secret.Type!,
        Overwrite: true,
      }));
    }
  }
  await migrateSecretsSSMPath(stage);
  await migrateSecretsSSMPath(".fallback");
}