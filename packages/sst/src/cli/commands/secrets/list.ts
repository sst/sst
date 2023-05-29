import type { Program } from "../../program.js";

export const list = (program: Program) =>
  program.command(
    "list [format]",
    "Fetch all the secrets",
    (yargs) =>
      yargs
        .positional("format", {
          type: "string",
          choices: ["table", "env", "json"],
        })
        .boolean('fallback'),
    async (args) => {
      const { Config } = await import("../../../config.js");
      const { gray } = await import("colorette");
      const { Colors } = await import("../../colors.js");
      const configSecrets = await Config.secrets();
      const secrets = !args.fallback
        ? configSecrets
        : Object.entries(configSecrets).reduce(
              (carry, [key, value]) => ({
                  ...carry,
                  ...(!value.value && !!value.fallback ? {[key]: value} : {}),
              }),
              {},
          );

      if (Object.entries(secrets).length === 0) {
        Colors.line("No secrets set");
        return;
      }
      switch (args.format || "table") {
        case "json":
          const env = Object.fromEntries(
            Object.entries(secrets).map(([key, { value, fallback }]) => [
              key,
              value || fallback,
            ])
          );

          console.log(JSON.stringify(env, null, 2));
          break;
        case "env":
          for (const [key, value] of Object.entries(secrets)) {
            console.log(`${key}=${value.value || `${value.fallback} #fallback`}`);
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

            const colourPadding = secrets[key].value ? 0 : gray("").length;

            console.log(
              `│ ${key.padEnd(keyLen)} │ ${value.padEnd(
                valueLen + colourPadding
              )} │`
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
