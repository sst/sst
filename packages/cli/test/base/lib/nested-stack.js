import * as cfn from "@aws-cdk/aws-cloudformation";
import * as s3 from "@aws-cdk/aws-s3";
import * as sst from "@serverless-stack/resources";

class MyNestedStack extends cfn.NestedStack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new s3.Bucket(this, "NestedBucket");
  }
}

export default class MyParentStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new MyNestedStack(this, "Nested1");
    new MyNestedStack(this, "Nested2");
  }
}
