const path = require("path");
const spawn = require("cross-spawn");
const paths = require("../../scripts/util/paths");

function runBootstrap(appPath, entry, handler, runtimeApi) {
  return spawn(
    "dotnet",
    [
      "exec",
      path.join(
        paths.ownPath,
        "scripts",
        "util",
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
