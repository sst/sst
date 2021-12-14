#!/usr/bin/env node

import { mkdirp } from "fs-extra";
import { sync } from "cross-spawn";

mkdirp("dist/bridge_client");

sync(
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
