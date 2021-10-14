const path = require("path");
const spawn = require("cross-spawn");

function runBootstrap(appPath, entry, handler, runtimeApi) {
  return spawn(
    "dotnet",
    [
      "exec",
      path.join(
        require.resolve("@serverless-stack/core"),
        "../../src/",
        "runtime",
        "shells",
        "dotnet-bootstrap",
        "release",
        "dotnet-bootstrap.dll"
      ),
      entry,
      handler,
    ],
    {
      stdio: ["inherit"],
      cwd: appPath,
      env: {
        ...process.env,
        AWS_LAMBDA_RUNTIME_API: runtimeApi,
      },
    }
  );
}

module.exports = runBootstrap;
