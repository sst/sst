const path = require("path");
const spawn = require("cross-spawn");
const paths = require("../../scripts/util/paths");

function runBootstrap(appPath, entry, handler, runtimeApi) {
  let lambdaResponse;

  return new Promise((resolve) => {
    const origHandlerPath = "dummy_path";

    const lambda = spawn(
      path.join(path.dirname(process.execPath), "node"),
      [
        path.join(paths.ownPath, "scripts", "util", "bootstrap.js"),
        path.join(appPath, entry),
        handler,
        origHandlerPath,
        paths.appBuildDir,
      ],
      {
        stdio: ["inherit", "inherit", "inherit", "ipc"],
        cwd: appPath,
        env: {
          ...process.env,
          AWS_LAMBDA_RUNTIME_API: runtimeApi,
        },
      }
    );

    function handleResponse(response) {
      switch (response.type) {
        case "success":
        case "failure":
        case "timeout":
        case "exit":
          lambdaResponse = response;
          break;
        default:
      }
    }

    lambda.on("message", handleResponse);
    lambda.on("exit", function () {
      resolve(lambdaResponse);
    });
  });
}

module.exports = runBootstrap;
