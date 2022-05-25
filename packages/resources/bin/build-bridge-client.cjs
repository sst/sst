#!/usr/bin/env node

const fs = require("fs-extra");
const spawn = require("cross-spawn");

fs.mkdirp("dist/bridge_client");

spawn.sync(
  "go",
  [
    "build",
    "-ldflags",
    "-s -w",
    "-o",
    "../../dist/bridge_client/handler",
    "bridge_client.go",
  ],
  {
    cwd: "./assets/bridge_client",
    stdio: "inherit",
    env: {
      ...process.env,
      GOOS: "linux",
      CGO_ENABLED: "0",
    },
  }
);
