import { workerData } from "node:worker_threads";
import path from "path";
import { fetch } from "undici";
import fs from "fs";
// import { createRequire } from "module";
// global.require = createRequire(import.meta.url);

const input = workerData;
const parsed = path.parse(input.handler);
const file = [".js", ".jsx", ".mjs", ".cjs"]
  .map((ext) => path.join(input.out, parsed.dir, parsed.name + ext))
  .find((file) => {
    return fs.existsSync(file);
  })!;

let mod: any;

try {
  mod = await import(file);
  // if (!mod) mod = require(file);
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
  let context: {
    awsRequestId: string;
    invokedFunctionArn: string;
  } = {} as any;

  try {
    const result = await fetch(`${input.url}/runtime/invocation/next`);
    context = {
      awsRequestId: result.headers.get("lambda-runtime-aws-request-id")!,
      invokedFunctionArn: result.headers.get(
        "lambda-runtime-invoked-function-arn"
      )!,
    };
    request = await result.json();
  } catch {
    continue;
  }
  (global as any)[Symbol.for("aws.lambda.runtime.requestId")] =
    context.awsRequestId;

  try {
    response = await mod[parsed.ext.substring(1)](request, context);
  } catch (ex: any) {
    await fetch(
      `${input.url}/runtime/invocation/${context.awsRequestId}/error`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          errorType: "Error",
          errorMessage: ex.message,
          trace: ex.stack?.split("\n"),
        }),
      }
    );
    continue;
  }

  await fetch(
    `${input.url}/runtime/invocation/${context.awsRequestId}/response`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    }
  );
}
