import * as cdk from "aws-cdk-lib";

class MySampleStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
