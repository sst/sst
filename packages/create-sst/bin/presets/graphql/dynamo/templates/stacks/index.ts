import { App } from "@serverless-stack/resources";
import { Api } from "./Api";
import { Database } from "./Database";
import { Web } from "./Web";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    srcPath: "services",
  });
  app.stack(Database).stack(Api).stack(Web);
}
