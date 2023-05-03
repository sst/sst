import { Colors } from "../colors.js";
import type { Program } from "../program.js";

export const connect = (program: Program) =>
  program.command(
    "connect",
    "",
    (yargs) => yargs,
    async (args) => {
      if (!args.future) throw new Error("This command is not yet available.");
      const { useAWSClient } = await import("../../credentials.js");
      const { useProject } = await import("../../project.js");
      const { useSTSIdentity } = await import("../../credentials.js");
      const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } =
        await import("@aws-sdk/client-iam");

      const client = useAWSClient(IAMClient);

      await client
        .send(
          new CreateRoleCommand({
            RoleName: "sst",
            AssumeRolePolicyDocument: JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Principal: {
                    AWS: "arn:aws:iam::917397401067:root",
                  },
                  Action: "sts:AssumeRole",
                },
              ],
            }),
          })
        )
        .catch((e) => {
          if (e.Error.Code === "EntityAlreadyExists") return;
          throw e;
        });
      await client.send(
        new AttachRolePolicyCommand({
          RoleName: "sst",
          PolicyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
        })
      );
      const project = useProject();
      const identity = await useSTSIdentity();

      console.log(
        `http://localhost:3000/connect?app=${project.config.name}&stage=${
          project.config.stage
        }&aws_account_id=${identity.Account!}`
      );
    }
  );
