import MyStack from "./MyStack";

export default function main(app) {
  app.setDefaultFunctionProps({
    runtime: "python3.8",
  });

  new MyStack(app, "my-stack");

  // Add more stacks
}
