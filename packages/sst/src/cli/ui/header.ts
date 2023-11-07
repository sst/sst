import { useProject } from "../../project.js";
import { Colors } from "../colors.js";
import { useLocalServerConfig } from "../local/server.js";

export async function printHeader(input: { console?: boolean; hint?: string }) {
  const project = useProject();
  Colors.line(
    `${Colors.primary.bold(`SST v${project.version}`)}  ${
      input.hint ? Colors.dim(`ready!`) : ""
    }`
  );
  Colors.gap();
  Colors.line(
    `${Colors.primary(`➜`)}  ${Colors.bold("App:")}     ${project.config.name}`
  );
  Colors.line(
    `${Colors.primary(` `)}  ${Colors.bold("Stage:")}   ${project.config.stage}`
  );
  if (input.console) {
    const local = await useLocalServerConfig();
    Colors.line(
      `${Colors.primary(` `)}  ${Colors.bold("Console:")} ${Colors.link(
        local.url + `/local/${project.config.name}/${project.config.stage}`
      )}`
    );
  }
  Colors.gap();
}

export function printConsole() {}
