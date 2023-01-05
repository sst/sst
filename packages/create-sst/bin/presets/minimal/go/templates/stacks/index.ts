import { MyStack } from "./MyStack.js";
import { App } from "sst/constructs";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "go1.x",
  });
  app.stack(MyStack);
}
