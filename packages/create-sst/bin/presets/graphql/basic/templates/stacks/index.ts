import { App } from "sst/constructs";
import { Api } from "./Api.js";
import { Web } from "./Web.js";
import { Database } from "./Database.js";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
  });
  app.stack(Database).stack(Api).stack(Web);
}
