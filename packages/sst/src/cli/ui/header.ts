import { Colors } from "../colors.js";
import { useLocalServerConfig } from "../local/server.js";

export async function printHeader(input: { console?: boolean }) {
  const local = await useLocalServerConfig();
  console.log(`${Colors.primary.bold("SST v2.0.4")}  ${Colors.dim(`ready!`)}`);
  console.log();
  console.log(`${Colors.primary(`➜`)}  ${Colors.bold("Stage:")}   dev`);
  if (input.console)
    console.log(
      `${Colors.primary(`➜`)}  ${Colors.bold("Console:")} ${Colors.link(
        local.url
      )}`
    );
  console.log();
}

export function printConsole() {}
