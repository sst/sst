import { SampleStack } from "./stacks/sample-stack";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  new SampleStack(app, "s3-1");
  new SampleStack(app, "s3-2");
}
