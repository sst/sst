import { Colors } from "../colors.js";
import { useLocalServerConfig } from "../local/server.js";

export async function printHeader(input: { console?: boolean }) {
  const local = await useLocalServerConfig();
  Colors.line(`${Colors.primary.bold("SST v2.0.4")}  ${Colors.dim(`ready!`)}`);
  Colors.gap();
  Colors.line(`${Colors.primary(`➜`)}  ${Colors.bold("Stage:")}   dev`);
  if (input.console)
    Colors.line(
      `${Colors.primary(`➜`)}  ${Colors.bold("Console:")} ${Colors.link(
        local.url
      )}`
    );
}

export function printConsole() {}
