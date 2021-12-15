import { State } from "../state";
import chokidar from "chokidar";
import { Handler } from "./handler";
import { Config } from "../config";
import path from "path";
import pm from "picomatch";
import { EventDelegate } from "../events";
import { uniq } from "remeda";

type Event = {
  funcs: (readonly [Handler.Opts, Handler.Instructions])[];
  files: string[];
};

export class Watcher {
  public readonly onChange = new EventDelegate<Event>();
  private chokidar?: chokidar.FSWatcher;

  public reload(root: string, config: Config) {
    const funcs = State.Function.read(root);
    const instructions = funcs.map(
      (f) => [f, Handler.instructions(f)] as const
    );
    const paths = uniq(instructions.flatMap(([_, i]) => i.watcher.include));
    const matchers = instructions.map(
      ([f, i]) => [f, i, i.watcher.include.map((p) => pm(p))] as const
    );
    if (this.chokidar) this.chokidar.close();
    const ignored = [
      path.resolve(path.join(root, path.dirname(config.main), "**")),
      "**/.build/**",
      "**/.sst/**",
    ];

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
      const funcs = matchers
        .filter(([_f, _i, matchers]) => matchers.some((m) => m(file)))
        .map(([f, i]) => [f, i] as const);
      this.onChange.trigger({
        funcs,
        files: [file],
      });
    });
  }
}
