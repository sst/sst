import %stack-name.PascalCased% from "./%stack-name.PascalCased%";

export default function main(app) {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: "go1.x"
  });

  new %stack-name.PascalCased%(app, "%stack-name%");

  // Add more stacks
}
