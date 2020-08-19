import * as sst from "@serverless-stack/resources";

export class SampleStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);
  }
}

export default function main(app: sst.App): void {
  let a;
  new SampleStack(app, "s3-1");
}
