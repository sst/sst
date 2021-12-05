"use strict";

import chokidar from "chokidar";

// Setup logger
import { getChildLogger } from "@serverless-stack/core";
const logger = getChildLogger("watcher");

const chokidarOptions = {
  persistent: true,
  ignoreInitial: true,
  followSymlinks: false,
  disableGlobbing: false,
  awaitWriteFinish: {
    pollInterval: 100,
    stabilityThreshold: 20,
  },
};

export default class Watcher {
  constructor(config) {
    const watchedFiles = [...config.lambdaFiles, ...config.cdkFiles];
    this.watcher = chokidar
      .watch(watchedFiles, chokidarOptions)
      .on("all", (ev, file) => config.onFileChange(file))
      .on("error", (error) => logger.info(`Watch ${error}`))
      .on("ready", () => {
        logger.debug(`Watcher ready for ${watchedFiles.length} files...`);
      });
  }

  //////////////////////
  // Public Functions //
  //////////////////////

  addFiles(files) {
    this.watcher.add(files);
  }

  async removeFiles(files) {
    if (files.length > 0) {
      await this.watcher.unwatch(files);
    }
  }
}
