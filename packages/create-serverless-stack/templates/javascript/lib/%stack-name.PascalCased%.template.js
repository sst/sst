import * as sst from "@serverless-stack/resources";

export default class %stack-name.PascalCased% extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET /": "src/lambda.handler",
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      "ApiEndpoint": api.httpApi.apiEndpoint,
    });
  }
}
