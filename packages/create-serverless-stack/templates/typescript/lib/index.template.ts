import %stack-name.PascalCased% from "./%stack-name.PascalCased%";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  new %stack-name.PascalCased%(app, "%stack-name%");

  // Add more stacks
}
