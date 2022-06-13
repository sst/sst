import { App } from "@serverless-stack/resources";
import { MyStack, OtherStack } from "./MyStack";
import { Parameter } from "./Parameter";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    srcPath: "api",
  });
  app.stack(MyStack).stack(OtherStack);
  Parameter.codegen();
}
