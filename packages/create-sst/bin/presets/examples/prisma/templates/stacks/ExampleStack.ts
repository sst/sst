import path from "path";
import fs from "fs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "sst/constructs";

export function ExampleStack({ stack, app }: StackContext) {
  if (!app.local) {
    // Create a layer for production
    // This saves shipping Prisma binaries once per function
    const layerPath = ".sst/layers/prisma";

    // Clear out the layer path
    fs.removeSync(layerPath, { force: true, recursive: true });
    fs.mkdirSync(layerPath, { recursive: true });

    // Copy files to the layer
    const toCopy = [
      "node_modules/.prisma",
      "node_modules/@prisma/client",
      "node_modules/prisma/build",
    ];
    for (const file of toCopy) {
      fs.copySync(file, path.join(layerPath, "nodejs", file), {
        // Do not include binary files that aren't for AWS to save space
        filter: (src) => !src.endsWith("so.node") || src.includes("rhel"),
      });
    }
    const prismaLayer = new lambda.LayerVersion(stack, "PrismaLayer", {
      code: lambda.Code.fromAsset(path.resolve(layerPath)),
    });

    // Add to all functions in this stack
    stack.addDefaultFunctionLayers([prismaLayer]);
  }

  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          DATABASE_URL: app.local
            ? "mysql://root@localhost:3306/test"
            : "mysql://production-url",
        },
        nodejs: {
          esbuild: {
            // Only reference external modules when deployed
            externalModules: app.local ? [] : ["@prisma/client", ".prisma"],
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
