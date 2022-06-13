import { App } from "@serverless-stack/resources";
import { MyStack } from "./MyStack";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    srcPath: "api",
  });
  app.stack(MyStack);
}
