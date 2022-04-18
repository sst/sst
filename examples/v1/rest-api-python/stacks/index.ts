import { App } from "@serverless-stack/resources";
import { MyStack } from "./MyStack";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "python3.8",
    srcPath: "backend",
  });
  app.stack(MyStack);
  // Add more stacks
}
