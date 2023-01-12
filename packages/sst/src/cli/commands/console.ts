import type { Program } from "../program.js";

export const consoleCommand = async (program: Program) =>
  program.command(
    "console",
    "Start the SST Console",
    (yargs) => yargs,
    async () => {
      const { blue } = await import("colorette");
      const { useRuntimeServer } = await import("../../runtime/server.js");
      const { useLocalServer } = await import("../local/server.js");
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
