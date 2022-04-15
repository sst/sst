import { MyStack } from "./MyStack";

export default function main(app) {
  app.setDefaultFunctionProps({
    runtime: "dotnetcore3.1",
  });
  app.stack(MyStack);
  // Add more stacks
}
