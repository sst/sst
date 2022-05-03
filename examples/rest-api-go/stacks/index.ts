import { App } from "@serverless-stack/resources";
import { MyStack } from "./MyStack";

export default function main(app: App) {
  app.setDefaultFunctionProps({
    runtime: "go1.x",
  });

  app.stack(MyStack);

  // Add more stacks
}
