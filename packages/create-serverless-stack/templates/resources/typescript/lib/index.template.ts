import %name.PascalCased%Stack from "./%name.PascalCased%Stack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  new %name.PascalCased%Stack(app, "%name.PascalCased%Stack");

  // Add more stacks
}
