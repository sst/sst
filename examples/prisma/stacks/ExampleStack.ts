import path from "path";
import fs from "fs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "sst/constructs";

const prismaDatabaseLayerPath = "./.sst/layers/prisma";

function preparePrismaLayerFiles(){
  // Clear out the layer path
  fs.rmSync(prismaDatabaseLayerPath, { force: true, recursive: true });
  fs.mkdirSync(prismaDatabaseLayerPath, { recursive: true });

  // Copy files to the layer
  const prismaFiles = [
    "node_modules/@prisma/client",
    "node_modules/prisma/build",
  ];
  for (const file of prismaFiles) {
    fs.cpSync(file, path.join(prismaDatabaseLayerPath, "nodejs", file), {
      // Do not include binary files that aren't for AWS to save space
      filter: (src) => !src.endsWith("so.node") || src.includes("rhel"),
      recursive: true,
    });
  }
    
  }

export function ExampleStack({ stack, app }: StackContext) {
  preparePrismaLayerFiles()
  
  // Create a layer for production
  // This saves shipping Prisma binaries once per function
  const prismaLayer = new lambda.LayerVersion(stack, "PrismaLayer", {
    code: lambda.Code.fromAsset(path.resolve(prismaDatabaseLayerPath)),
  });

  // Add to all functions in this stack
  stack.addDefaultFunctionLayers([prismaLayer]);

  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        runtime: "nodejs20.x",
        environment: {
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
