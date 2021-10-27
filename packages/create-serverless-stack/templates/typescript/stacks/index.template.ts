import %stack-name.PascalCased% from "./%stack-name.PascalCased%";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  // Set default runtime for all functions
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x"
  });

  new %stack-name.PascalCased%(app, "%stack-name%");

  // Add more stacks
}
