import MyStack from "./MyStack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  if (process.env.IS_LOCAL) {
    app.setDefaultFunctionProps({
      timeout: 30,
    });
  }

  new MyStack(app, "my-stack");

  // Add more stacks
}
