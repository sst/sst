const path = require("path");
const fs = require("fs-extra");
const { initializeLogger } = require("@serverless-stack/core");
const LambdaRuntimeServer = require("../../scripts/util/LambdaRuntimeServer");
const {
  runNodeBootstrap,
  clearBuildOutput,
  testBuildDir: buildDir,
} = require("../helpers");

const appPath = path.resolve(__dirname);
const appBuildPath = path.join(appPath, buildDir);

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
  fs.emptyDirSync(appBuildPath);
  initializeLogger(appBuildPath);
});

afterAll(async () => {
  await clearBuildOutput(appBuildPath);
  lambdaServer.stop();
});

test("nodejs-bootstrap async", async () => {
  const response = await runNodeBootstrap(
    appPath,
    entry,
    "fnAsync",
    runtimeApi,
    { buildDir }
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("nodejs-bootstrap sync callback called", async () => {
  const response = await runNodeBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled",
    runtimeApi,
    { buildDir }
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("nodejs-bootstrap sync callback called with callbackWaitsForEmptyEventLoop true", async () => {
  const response = await runNodeBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled_PendingEventLoop_WaitTrue",
    runtimeApi,
    { buildDir }
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("nodejs-bootstrap sync callback called with callbackWaitsForEmptyEventLoop false", async () => {
  const response = await runNodeBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled_PendingEventLoop_WaitFalse",
    runtimeApi,
    { buildDir }
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("nodejs-bootstrap async callback not called", async () => {
  const response = await runNodeBootstrap(
    appPath,
    entry,
    "fnSync_CallbackNotCalled",
    runtimeApi,
    { buildDir }
  );
  expect(response).toEqual({ data: null, type: "success" });
});

test("nodejs-bootstrap async callback will call", async () => {
  const response = await runNodeBootstrap(
    appPath,
    entry,
    "fnSync_CallbackWillCall",
    runtimeApi,
    { buildDir }
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});
