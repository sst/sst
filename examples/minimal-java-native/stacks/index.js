import { MyStack } from "./MyStack";
import { App } from "@serverless-stack/resources";

/**
 * @param {App} app
 */
export default function (app) {
  app.setDefaultFunctionProps({
    runtime: "java11",
    srcPath: "services",
    bundle: {
      buildCommand: "buildNativeLambda",
      buildOutputFolder: "libs",
      customRuntime: true      
    }
  });
  app.stack(MyStack);
}
