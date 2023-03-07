import { workerData } from "node:worker_threads";
import path from "path";
import { fetch } from "undici";
import fs from "fs";
import url from "url";
import { Context as LambdaContext } from "aws-lambda";
// import { createRequire } from "module";
// global.require = createRequire(import.meta.url);

const createLambdaContext = (
  invokedFunctionArn: string,
  awsRequestId: string,
  deadlineMs: string,
  identity: string,
  clientContext: string,
  logGroupName: string,
  logStreamName: string
): LambdaContext => ({
  awsRequestId,
  invokedFunctionArn,
  getRemainingTimeInMillis: () => Math.max(Number(deadlineMs) - Date.now(), 0),
  // If identity is null, we want to mimick AWS behavior and return undefined
  identity: JSON.parse(identity) ?? undefined,
  // If clientContext is null, we want to mimick AWS behavior and return undefined
  clientContext: JSON.parse(clientContext) ?? undefined,
  functionName: process.env.AWS_LAMBDA_FUNCTION_NAME!,
  functionVersion: "$LATEST",
  memoryLimitInMB: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE!,
  logGroupName,
  logStreamName,
  callbackWaitsForEmptyEventLoop: {
    set value(_value: boolean) {
      throw new Error(
        "`callbackWaitsForEmptyEventLoop` on lambda Context is not implemented by SST Live Lambda Development."
      );
    },
    get value() {
      return true;
    },
  }.value,
  done() {
    throw new Error(
      "`done` on lambda Context is not implemented by SST Live Lambda Development."
    );
  },
  fail() {
    throw new Error(
      "`fail` on lambda Context is not implemented by SST Live Lambda Development."
    );
  },
  succeed() {
    throw new Error(
      "`succeed` on lambda Context is not implemented by SST Live Lambda Development."
    );
  },
});

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
  let context: LambdaContext;

  try {
    const result = await fetch(`${input.url}/runtime/invocation/next`);
    context = createLambdaContext(
      result.headers.get("lambda-runtime-invoked-function-arn")!,
      result.headers.get("lambda-runtime-aws-request-id")!,
      result.headers.get("lambda-runtime-deadline-ms")!,
      result.headers.get("lambda-runtime-cognito-identity")!,
      result.headers.get("lambda-runtime-client-context")!,
      result.headers.get("lambda-runtime-log-group-name")!,
      result.headers.get("lambda-runtime-log-stream-name")!
    );
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

  while (true) {
    try {
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
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}
