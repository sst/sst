import { SampleStack } from "./sample-stack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  new SampleStack(app, "queue");
}
