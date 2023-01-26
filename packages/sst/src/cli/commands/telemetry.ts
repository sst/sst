import { Colors } from "../colors.js";
import type { Program } from "../program.js";

export const telemetry = (program: Program) =>
  program.command(
    "telemetry <action>",
    "Load environment variables and start your frontend",
    (yargs) =>
      yargs.positional("action", {
        type: "string",
        describe: "Whether to enable or disable",
        choices: ["enable", "disable"],
        demandOption: true,
      }),
    async (args) => {
      const { enable, disable } = await import("../telemetry/telemetry.js");

      if (args.action === "enable") {
        enable();
        Colors.line(Colors.success(`✔ `), `Telemetry enabled`);
      }

      if (args.action === "disable") {
        disable();
        Colors.line(Colors.success(`✔ `), `Telemetry disabled`);
      }
    }
  );
