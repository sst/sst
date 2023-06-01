import { Colors } from "../colors.js";
import type { Program } from "../program.js";

export const connect = (program: Program) =>
  program.command(
    "connect",
    "Connect a stage to SST Console",
    (yargs) =>
      yargs.option("dev", {
        type: "boolean",
        default: false,
        describe: "Connect to SST dev account (probably don't want to do this)",
      }),
    async (args) => {
      if (!args.future) throw new Error("This command is not yet available.");
      const { useAWSClient } = await import("../../credentials.js");
      const { useProject } = await import("../../project.js");
      const { useSTSIdentity } = await import("../../credentials.js");
      const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } =
        await import("@aws-sdk/client-iam");

      const client = useAWSClient(IAMClient);

      if (args.dev) {
        Colors.line(
          Colors.warning("⚠"),
          Colors.bold(" Connecting to dev stage")
        );
      }
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
                    AWS: `arn:aws:iam::${
                      args.dev ? "917397401067" : "226609089145"
                    }:root`,
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

      const host = args.dev
        ? "http://localhost:3000"
        : "https://console.production.sst.dev";
      console.log(
        `${host}/connect?app=${project.config.name}&stage=${
          project.config.stage
        }&aws_account_id=${identity.Account!}&region=${project.config.region}`
      );
    }
  );
