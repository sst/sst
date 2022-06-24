import { App } from "@serverless-stack/resources";
import { Api } from "./Api";
import { Relational } from "./Relational";
import { Dynamo } from "./Dynamo";
import { Web } from "./Web";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    srcPath: "services",
  });
  app.stack(Relational).stack(Dynamo).stack(Api).stack(Web);
}
