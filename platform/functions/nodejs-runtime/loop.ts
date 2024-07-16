import { Worker } from "node:worker_threads";
import { createInterface } from "node:readline";

interface WorkerStartMessage {
  type: "worker.start";
  workerID: string;
}
interface WorkerStopMessage {
  type: "worker.stop";
}
type Message = WorkerStartMessage | WorkerStopMessage;

const rl = createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on("line", (line) => {
  console.log(line);
});

new Worker(new URL("../index.js", import.meta.url).pathname, {});
