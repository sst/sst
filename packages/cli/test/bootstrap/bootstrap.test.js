const path = require("path");
const fs = require("fs-extra");
const { initializeLogger } = require("@serverless-stack/core");
const { runBootstrap, clearBuildOutput } = require("../helpers");
const LambdaRuntimeServer = require("../../scripts/util/LambdaRuntimeServer");
const paths = require("../../scripts/util/paths");

const appPath = path.resolve(__dirname);
const entry = "lambda.js";
let lambdaServer;
let runtimeApi;

beforeAll(async () => {
  // Start Lambda Runtime server
  lambdaServer = new LambdaRuntimeServer();
  await lambdaServer.start("127.0.0.1", 12557);

  // Build Runtime API
  const debugRequestId = "debug-request-id";
  runtimeApi = `${lambdaServer.host}:${lambdaServer.port}/${debugRequestId}`;

  // Add request
  lambdaServer.addRequest({
    debugRequestId,
    timeoutAt: Date.now() + 3000,
    event: {},
    context: {},
    onSuccess: () => {},
    onFailure: () => {},
  });
});

beforeEach(async () => {
  const buildDir = path.join(__dirname, paths.appBuildDir);
  fs.emptyDirSync(buildDir);
  initializeLogger(buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
  lambdaServer.stop();
});

test("bootstrap async", async () => {
  const response = await runBootstrap(appPath, entry, "fnAsync", runtimeApi);
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap sync callback called", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled",
    runtimeApi
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap sync callback called with callbackWaitsForEmptyEventLoop true", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled_PendingEventLoop_WaitTrue",
    runtimeApi
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap sync callback called with callbackWaitsForEmptyEventLoop false", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled_PendingEventLoop_WaitFalse",
    runtimeApi
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap async callback not called", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackNotCalled",
    runtimeApi
  );
  expect(response).toEqual({ data: null, type: "success" });
});

test("bootstrap async callback will call", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackWillCall",
    runtimeApi
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});
