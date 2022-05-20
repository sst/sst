import { State } from "../state/index.js";
import chokidar from "chokidar";
import { Handler } from "./handler/index.js";
import { EventDelegate } from "../events.js";
import { uniq } from "remeda";

type Event = {
  files: string[];
};

export class Watcher {
  public readonly onChange = new EventDelegate<Event>();
  private chokidar?: chokidar.FSWatcher;

  public reload(root: string) {
    const funcs = State.Function.read(root);
    const instructions = funcs.map(
      (f) => [f, Handler.instructions(f)] as const
    );
    const paths = uniq(instructions.flatMap(([_, i]) => i.watcher.include));
    if (this.chokidar) this.chokidar.close();
    const ignored = ["**/node_modules/**", "**/.build/**", "**/.sst/**"];

    this.chokidar = chokidar.watch(paths, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      disableGlobbing: false,
      ignored,
      awaitWriteFinish: {
        pollInterval: 100,
        stabilityThreshold: 20,
      },
    });
    this.chokidar.on("change", (file) => {
      this.onChange.trigger({
        files: [file],
      });
    });
  }
}
