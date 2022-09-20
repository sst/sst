import { MyStack } from "./MyStack";
import { App } from "@serverless-stack/resources";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "go1.x",
    srcPath: "services",
  });
  app.stack(MyStack);
}
