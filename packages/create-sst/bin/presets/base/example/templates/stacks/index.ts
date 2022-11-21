import { App } from "sst";
import { MyStack } from "./MyStack.js";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    srcPath: "services",
  });
  app.stack(MyStack);
}
