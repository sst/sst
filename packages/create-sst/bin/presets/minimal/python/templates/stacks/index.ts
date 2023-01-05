import { MyStack } from "./MyStack.js";
import { App } from "sst/constructs";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "python3.9",
  });
  app.stack(MyStack);
}
