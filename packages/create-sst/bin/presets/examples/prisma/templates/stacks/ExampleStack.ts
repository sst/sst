import path from "path";
import fs from "fs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "sst/constructs";

const prismaDatabaseLayerPath = "./.sst/layers/prisma";

function preparePrismaLayerFiles() {
  // Remove any existing layer path data
  fs.rmSync(prismaDatabaseLayerPath, { force: true, recursive: true });

  // Create a fresh new layer path
  fs.mkdirSync(prismaDatabaseLayerPath, { recursive: true });

  // Prisma folders to retrieve the client and the binaries from
  const prismaFiles = [
    "node_modules/@prisma/client",
    "node_modules/prisma/build",
  ];

  for (const file of prismaFiles) {
    fs.cpSync(file, path.join(prismaDatabaseLayerPath, "nodejs", file), {
      // Do not include binary files that aren't for AWS to save space
      filter: (src) =>
        !src.endsWith("so.node") ||
        src.includes("rhel") ||
        src.includes("linux-arm64"),
      recursive: true,
    });
  }
}

export function ExampleStack({ stack, app }: StackContext) {
  preparePrismaLayerFiles();

  // Creation of the Prisma layer
  const prismaLayer = new lambda.LayerVersion(stack, "PrismaLayer", {
    code: lambda.Code.fromAsset(path.resolve(prismaDatabaseLayerPath)),
  });

  // Add the Prisma layer to all functions in this stack
  stack.addDefaultFunctionLayers([prismaLayer]);

  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        runtime: "nodejs20.x",
        environment: {
          // You can also use the Config.DATABASE_URL object here
          // or the bind functionality instead of environment props, i.e. bind: [DATABASE_URL],
          DATABASE_URL: process.env.DATABASE_URL!,
        },
        nodejs: {
          esbuild: {
            external: ["@prisma/client", ".prisma"],
          },
        },
      },
    },
    routes: {
      "GET /post": "packages/functions/src/index.handler",
    },
  });

  stack.addOutputs({
    api: api.url,
  });
}
