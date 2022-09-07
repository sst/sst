import { cpus } from "os";

type Task = () => Promise<void>;

const tasks: Task[] = [];

export async function addTask(task: Task) {
  tasks.push(task);
}

export function run() {
  const concurrency = cpus().length - 1;
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

function runTask() {

  return new Promise((resolve) => {
  });
}

export * as DeferBuilder from "./index.js";