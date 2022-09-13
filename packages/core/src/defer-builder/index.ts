import { cpus } from "os";
import { getChildLogger } from "../logger.js";
const logger = getChildLogger("defer-builder");

type Task = () => Promise<void>;

const tasks: Task[] = [];

export async function addTask(task: Task) {
  tasks.push(task);
}

export function run() {
  const coreNum = cpus().length;
  logger.debug("CPU cores", coreNum);
  const concurrency = Math.max(1, process.env.SST_BUILD_CONCURRENCY
    ? parseInt(process.env.SST_BUILD_CONCURRENCY, 10)
    : coreNum - 1);
  let remaining = tasks.length;

  return new Promise((resolve, reject) => {

    const runTask = () => {
      // Get task
      const task = tasks.shift();
      if (!task) {
        // all tasks completed
        if (remaining === 0) {
          resolve(true);
        }
        return;
      }

      // Run task
      task().then(() => {
        remaining--;
        runTask();
      }).catch((e) => {
        reject(e);
      });
    };

    // Run tasks in parallel
    for (let i = 0; i < concurrency; i++) {
      runTask();
    }
  });
}

export * as DeferBuilder from "./index.js";