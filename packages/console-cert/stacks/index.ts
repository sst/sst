import { CertStack } from "./CertStack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
  });

  app.stack(CertStack);
}
