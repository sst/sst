import { Program } from "../../program.js";
import { get } from "./get.js";
import { list } from "./list.js";
import { remove } from "./remove.js";
import { set } from "./set.js";

export function secrets(program: Program) {
  program.command("secrets", "Manage secrets", (yargs) => {
    yargs.demandCommand(1);
    remove(yargs);
    get(yargs);
    list(yargs);
    set(yargs);

    return yargs;
  });
}
