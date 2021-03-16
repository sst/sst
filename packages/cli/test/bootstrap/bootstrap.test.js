const path = require("path");
const fs = require("fs-extra");
const { initializeLogger } = require("@serverless-stack/core");
const { runBootstrap, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  const buildDir = path.join(__dirname, paths.appBuildDir);
  fs.emptyDirSync(buildDir);
  initializeLogger(buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

const appPath = path.resolve(__dirname);
const entry = "lambda.js";

test("bootstrap async", async () => {
  const response = await runBootstrap(appPath, entry, "fnAsync");
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap sync callback called", async () => {
  const response = await runBootstrap(appPath, entry, "fnSync_CallbackCalled");
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap sync callback called with callbackWaitsForEmptyEventLoop true", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled_PendingEventLoop_WaitTrue"
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap sync callback called with callbackWaitsForEmptyEventLoop false", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackCalled_PendingEventLoop_WaitFalse"
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});

test("bootstrap async callback not called", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackNotCalled"
  );
  expect(response).toEqual({ data: null, type: "success" });
});

test("bootstrap async callback will call", async () => {
  const response = await runBootstrap(
    appPath,
    entry,
    "fnSync_CallbackWillCall"
  );
  expect(response).toEqual({ data: "hi", type: "success" });
});
