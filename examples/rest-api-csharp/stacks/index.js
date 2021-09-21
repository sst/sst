import MyStack from "./MyStack";

export default function main(app) {
  app.setDefaultFunctionProps({
    runtime: "dotnetcore3.1",
  });

  new MyStack(app, "my-stack");

  // Add more stacks
}
