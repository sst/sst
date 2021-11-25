import MyStack from "./MyStack";

export default function main(app) {
  // Set default runtime for all functions
  if (!app.local) {
    app.setDefaultFunctionProps({
      runtime: "nodejs12.x",
      bundle: {
        externalModules: [
          "fsevents",
          "jest",
          "jest-runner",
          "jest-config",
          "jest-resolve",
          "jest-pnp-resolver",
          "jest-environment-node",
          "jest-environment-jsdom",
        ],
      },
    });
  } else {
    app.setDefaultFunctionProps({
      runtime: "nodejs12.x",
    });
  }

  new MyStack(app, "my-stack");

  // Add more stacks
}
