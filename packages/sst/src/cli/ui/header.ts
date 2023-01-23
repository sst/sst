import { useProject } from "../../project.js";
import { Colors } from "../colors.js";
import { useLocalServerConfig } from "../local/server.js";

export async function printHeader(input: { console?: boolean }) {
  const project = useProject();
  Colors.line(`${Colors.primary.bold("SST v2.0.4")}  ${Colors.dim(`ready!`)}`);
  Colors.gap();
  Colors.line(
    `${Colors.primary(`➜`)}  ${Colors.bold("Stage:")}   ${project.config.stage}`
  );
  if (input.console) {
    const local = await useLocalServerConfig();
    Colors.line(
      `${Colors.primary(`➜`)}  ${Colors.bold("Console:")} ${Colors.link(
        local.url
      )}`
    );
  }
  Colors.gap();
}

export function printConsole() {}
