import { workerData } from "node:worker_threads";
import path from "path";
import { fetch } from "undici";
import fs from "fs";
import url from "url";
// import { createRequire } from "module";
// global.require = createRequire(import.meta.url);

const input = workerData;
const parsed = path.parse(input.handler);
const file = [".js", ".jsx", ".mjs", ".cjs"]
  .map((ext) => path.join(input.out, parsed.dir, parsed.name + ext))
  .find((file) => {
    return fs.existsSync(file);
  })!;

let fn: any;

try {
  const { href } = url.pathToFileURL(file);
  const mod = await import(href);
  const handler = parsed.ext.substring(1);
  fn = mod[handler];
  if (!fn) {
    throw new Error(
      `Function "${handler}" not found in "${
        input.handler
      }". Found ${Object.keys(mod).join(", ")}`
    );
  }
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
  process.exit(1);
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
    response = await fn(request, context);
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
