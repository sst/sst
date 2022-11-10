import { workerData } from "node:worker_threads";
import path from "path";
import { fetch } from "undici";
import fs from "fs";

const input = workerData;
const parsed = path.parse(input.handler);
const file = [".js", ".jsx", ".mjs", ".cjs"]
  .map((ext) => path.join(parsed.dir, parsed.name + ext))
  .find((file) => {
    return fs.existsSync(file);
  })!;

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
  let request: any;
  let response: any;
  let requestID: string;

  try {
    const result = await fetch(`${input.url}/runtime/invocation/next`);
    requestID = result.headers.get("lambda-runtime-aws-request-id")!;
    request = await result.json();
  } catch {
    continue;
  }

  try {
    response = await mod[parsed.ext](request);
  } catch (ex: any) {
    console.log(ex);
    await fetch(`${input.url}/runtime/invocation/${requestID}/error`, {
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

  await fetch(`${input.url}/runtime/invocation/${requestID}/response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  });
}
