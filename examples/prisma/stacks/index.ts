import * as sst from "@serverless-stack/resources";
import * as lambda from "@aws-cdk/aws-lambda";
import fs from "fs-extra";
import path from "path";

export default function (app: sst.App) {
  new Stack(app);
}

class Stack extends sst.Stack {
  constructor(scope: sst.App) {
    super(scope, "Stack");

    if (!scope.local) {
      // Create a layer for production. This saves shipping Prisma binaries once per function
      const layerPath = ".sst/layers/prisma";
      fs.rmSync(layerPath, { force: true, recursive: true });
      fs.mkdirSync(layerPath, { recursive: true });
      const toCopy = ["node_modules/.prisma", "node_modules/@prisma/client"];
      for (const file of toCopy) {
        fs.copySync(file, path.join(layerPath, "nodejs", file), {
          // Do not include binary files that aren't for AWS to save space
          filter: (src) => !src.endsWith("so.node") || src.includes("rhel"),
        });
      }
      const prismaLayer = new lambda.LayerVersion(this, "PrismaLayer", {
        code: lambda.Code.fromAsset(path.resolve(layerPath)),
      });

      // Add to all functions
      this.addDefaultFunctionLayers([prismaLayer]);
    }

    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        environment: {
          DATABASE_URL: scope.local
            ? "mysql://root@localhost:3306/test"
            : "mysql://production-url",
        },
        bundle: {
          // Only reference external modules when deployed
          externalModules: scope.local ? [] : ["@prisma/client", ".prisma"],
        },
      },
      routes: {
        "GET /post": "src/index.handler",
      },
    });

    this.addOutputs({
      api: api.url,
    });
  }
}
