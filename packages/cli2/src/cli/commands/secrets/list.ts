import { Program } from "@cli/program.js";

export const list = (program: Program) =>
  program.command(
    "list [format]",
    "Fetch and decrypt all secrets",
    (yargs) => yargs.positional("format", { type: "string", default: "table" }),
    async (args) => {
      const { Config } = await import("@core/config.js");
      const { gray } = await import("colorette");

      const secrets = await Config.secrets();
      switch (args.format) {
        case "env":
          for (const [key, value] of Object.entries(secrets)) {
            console.log(`${key}=${value.value || value.fallback}`);
          }
          break;
        case "table":
          const keys = Object.keys(secrets);
          const keyLen = Math.max(
            "Secrets".length,
            ...keys.map((key) => key.length)
          );
          const valueLen = Math.max(
            "Values".length,
            ...keys.map((key) =>
              secrets[key].value
                ? secrets[key].value!.length
                : `${secrets[key].fallback} (fallback)`.length
            )
          );

          console.log(
            "┌".padEnd(keyLen + 3, "─") +
              "┬" +
              "".padEnd(valueLen + 2, "─") +
              "┐"
          );
          console.log(
            `│ ${"Secrets".padEnd(keyLen)} │ ${"Values".padEnd(valueLen)} │`
          );
          console.log(
            "├".padEnd(keyLen + 3, "─") +
              "┼" +
              "".padEnd(valueLen + 2, "─") +
              "┤"
          );
          keys.sort().forEach((key) => {
            const value = secrets[key].value
              ? secrets[key].value!
              : `${secrets[key].fallback} ${gray("(fallback)")}`;
            console.log(
              `│ ${key.padEnd(keyLen)} │ ${value.padEnd(valueLen)} │`
            );
          });
          console.log(
            "└".padEnd(keyLen + 3, "─") +
              "┴" +
              "".padEnd(valueLen + 2, "─") +
              "┘"
          );
          break;
      }
    }
  );
