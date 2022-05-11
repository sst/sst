import { App } from "@serverless-stack/resources";
import { Api } from "./Api";
import { Web } from "./Web";
import { Database } from "./Database";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
    srcPath: "backend",
    bundle: {
      format: "esm",
    },
  });
  app.stack(Database).stack(Api).stack(Web);
}
