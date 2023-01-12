import { blue } from "colorette";
import { useRuntimeServer } from "../../runtime/server.js";
import { useLocalServer } from "../local/server.js";
import { Program } from "../program.js";

export const consoleCommand = async (program: Program) =>
  program.command(
    "console",
    "Start the SST Console",
    (yargs) => yargs,
    async () => {
      await Promise.all([
        useRuntimeServer(),
        useLocalServer({
          key: "",
          cert: "",
          live: false,
          port: 13557,
        }),
      ]);
      console.log(`Console started: ${blue(`https://console.sst.dev`)}`);
    }
  );
