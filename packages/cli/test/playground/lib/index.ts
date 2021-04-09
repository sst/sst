import { ApiV1Stack } from "./apiv1-stack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  new ApiV1Stack(app, "sample");
}
