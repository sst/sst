/// <reference path="./.sst/platform/src/global.d.ts" />

import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execSync } from "node:child_process";

export default $config({
  app(input) {
    return {
      name: "wundergraph",
      providers: {
        aws: {
          profile: "sst-dev",
        },
      },
    };
  },
  async run() {
    await fs.mkdir(".wundergraph", { recursive: true });

    if (
      await fs
        .stat(".wundergraph/bootstrap")
        .then(() => false)
        .catch(() => true)
    ) {
      const stream = createWriteStream(".wundergraph/bootstrap.tar");
      const response = await fetch(
        "https://github.com/wundergraph/cosmo/releases/download/aws-lambda-router%400.2.0/bootstrap-aws-lambda-router@0.2.0-linux-amd64.tar.gz",
      );
      if (!response.ok) {
        throw new Error("Failed to download bootstrap");
      }
      // @ts-expect-error
      await pipeline(Readable.fromWeb(response.body!), stream);
      execSync("tar -xvf .wundergraph/bootstrap.tar -C .wundergraph");
      await fs.rm(".wundergraph/bootstrap.tar");
    }

    await fs.cp("router.json", ".wundergraph/router.json");

    const router = new sst.Function("Router", {
      bundle: ".wundergraph",
      handler: "bootstrap",
      runtime: "provided.al2023",
      url: true,
    });

    return {
      url: router.url,
    };
  },
});

// future
$config({
  app(input) {
    return {
      name: "wundergraph",
      providers: {
        aws: {
          profile: "sst-dev",
        },
      },
      plugins: {
        "wundergraph/cosmo": "v0.2.0", // resolves to github + git tag
      },
    };
  },
  async run() {
    const vpc = aws.ec2.Vpc.get("vpc", "some-existing-vpc");

    // @ts-expect-error
    const router = new wundergraph.Cosmo("Router", {
      config: "./router.json",
      vpc,
    });

    return {
      url: router.url,
    };
  },
});
