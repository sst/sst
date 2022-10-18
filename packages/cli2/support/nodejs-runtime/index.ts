import { workerData } from "node:worker_threads";
import path from "path";
import { fetch } from "undici";

const input = workerData;
const ext = path.extname(input.handler);
const file = path.join(input.out, input.handler.replace(ext, ".mjs"));

let mod: any;

try {
  mod = await import(file);
} catch (ex: any) {
  await fetch(`${input.url}/runtime/init/error`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      errorType: "Error",
      errorMessage: ex.message,
      trace: ex.stack?.split("\n"),
    }),
  });
}

let timeout: NodeJS.Timeout | undefined;
while (true) {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    process.exit(0);
  }, 1000 * 60 * 15);
  try {
    const result = await fetch(`${input.url}/runtime/invocation/next`);
    const body = await result.json();

    const response = await mod[ext.substring(1)](body);

    await fetch(`${input.url}/runtime/invocation/whatever/response`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    });
  } catch (ex: any) {
    console.log(ex);
    await fetch(`${input.url}/runtime/invocation/whatever/error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        errorType: "Error",
        errorMessage: ex.message,
        trace: ex.stack?.split("\n"),
      }),
    });
  }
}
