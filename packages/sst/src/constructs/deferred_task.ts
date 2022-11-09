import { cpus } from "os";
import { createAppContext } from "./context.js";

type Task = () => Promise<void>;

export const useDeferredTasks = createAppContext(() => {
  const tasks: Task[] = [];

  return {
    add(task: Task) {
      tasks.push(task);
    },
    async run() {
      const coreNum = cpus().length;
      const concurrency = Math.max(
        1,
        process.env.SST_BUILD_CONCURRENCY
          ? parseInt(process.env.SST_BUILD_CONCURRENCY, 10)
          : coreNum - 1
      );
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
          task()
            .then(() => {
              remaining--;
              runTask();
            })
            .catch((e) => {
              reject(e);
            });
        };

        // Run tasks in parallel
        for (let i = 0; i < concurrency; i++) {
          runTask();
        }
      });
    },
  };
});
