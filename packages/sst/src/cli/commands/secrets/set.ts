import { Program } from "../../program.js";
import { Config } from "../../../config.js";
import { blue } from "colorette";
import { createSpinner } from "../../spinner.js";

export const set = (program: Program) =>
  program
    .command(
      "set <name> <value>",
      "Set secret value",
      yargs =>
        yargs
          .positional("name", {
            type: "string",
            describe: "Name of secret",
            demandOption: true
          })
          .positional("value", {
            type: "string",
            describe: "Value to set",
            demandOption: true
          }),
      async args => {
        const setting = createSpinner(
          `Setting secret ${blue(args.name)}`
        ).start();
        await Config.setSecret({
          key: args.name,
          value: args.value
        });
        setting.succeed();
        const restarting = createSpinner(
          `Restarting all functions using ${blue(args.name)}...`
        ).start();
        const count = await Config.restart(args.name);
        restarting.succeed(`Restarted ${blue(count)} functions`);
      }
    )
    .command(
      "set-fallback <name> <value>",
      "Set a fallback value for secret",
      yargs =>
        yargs
          .positional("name", {
            type: "string",
            describe: "Name of secret",
            demandOption: true
          })
          .positional("value", {
            type: "string",
            describe: "Value to set",
            demandOption: true
          }),
      async args => {
        console.log("Setting", `${blue(args.name)}...`);
        await Config.setSecret({
          key: args.name,
          value: args.value,
          fallback: true
        });
        console.log("Restarting all functions using", `${blue(args.name)}...`);
        const count = await Config.restart(args.name);
        console.log("✅ Restarted", `${blue(count)}`, "functions");
      }
    );
