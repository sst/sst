const path = require("path");
const fs = require("fs-extra");
const spawn = require("cross-spawn");
const { initializeLogger } = require("@serverless-stack/core");
const LambdaRuntimeServer = require("../../scripts/util/LambdaRuntimeServer");
const { runDotnetBootstrap, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

const appPath = path.resolve(__dirname);
const buildDir = path.join(appPath, paths.appBuildDir);
const debugRequestId = "debug-request-id";
const host = "127.0.0.1";
const port = 12557;
const runtimeApi = `${host}:${port}/${debugRequestId}`;
let lambdaServer;

beforeAll(async () => {
  // Start Lambda Runtime server
  lambdaServer = new LambdaRuntimeServer();
  await lambdaServer.start(host, port);
});

beforeEach(async () => {
  fs.emptyDirSync(buildDir);
  initializeLogger(buildDir);
});

afterAll(async () => {
  await clearBuildOutput(appPath);
  lambdaServer.stop();
});

test("dotnet-bootstrap", async () => {
  // Build
  const buildPromise = new Promise((resolve, reject) => {
    const cp = spawn(
      "dotnet",
      [
        "publish",
        "--output",
        path.join(buildDir, "output"),
        "--configuration",
        "Release",
        "--framework",
        "netcoreapp3.1",
        "--self-contained",
        "false",
        "-nologo",
      ],
      {
        stdio: "inherit",
        cwd: path.join(appPath, "Sample"),
      }
    );

    cp.on("error", (e) => {
      console.log(".NET build error", e);
    });

    cp.on("close", (code) => {
      if (code !== 0) {
        reject();
      } else {
        resolve();
      }
    });
  });
  await buildPromise;

  // Add request
  let bootstrapProcess;
  const requestPromise = new Promise((resolve, reject) => {
    lambdaServer.addRequest({
      debugRequestId,
      timeoutAt: Date.now() + 3000,
      event: {},
      context: {},
      onSuccess: (data) => {
        process.kill(bootstrapProcess.pid, "SIGKILL");
        resolve(data);
      },
      onFailure: () => {
        process.kill(bootstrapProcess.pid, "SIGKILL");
        reject();
      },
    });
  });

  // Run bootstrap
  const entry = path.join(buildDir, "output", "Sample.dll");
  const handler = "Sample::Sample.Handlers::Handler";
  bootstrapProcess = runDotnetBootstrap(appPath, entry, handler, runtimeApi);

  // Wait for request to be processed
  const response = await requestPromise;

  expect(response).toEqual({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: "Hello World!",
    isBase64Encoded: false,
  });
});
