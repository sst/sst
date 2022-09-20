import { MyStack } from "./MyStack";
import { App } from "@serverless-stack/resources";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "dotnetcore3.1",
    srcPath: "services",
  });
  app.stack(MyStack);
}
