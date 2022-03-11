import * as sst from "@serverless-stack/resources";

interface StackProps extends sst.StackProps {
  readonly api: sst.Api;
}

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props: StackProps) {
    super(scope, id, props);

    props.api.addRoutes(this, {
      "GET /extraRoute1": "src/lambda.main",
      "POST /extraRoute2": "src/lambda.main",
    });
  }
}
