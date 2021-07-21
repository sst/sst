import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // Create an SNS topic
    new sst.Topic(this, "MyTopic", {});
  }
}

export default function main(app: sst.App): void {
  new MySampleStack(app, "sample");
}