import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        timeout: 10,
      },
      routes: {
        "GET /": "src/lambda.main",
      },
    });

    this.api = api;

    this.addOutputs({
      Endpoint: api.url,
    });
  }
}
