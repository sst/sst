import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
  }
}

export default function main(app) {
  new MySampleStack(app, "sample", {
    env: { account: "dummy", region: "us-east-1" },
  });
}
