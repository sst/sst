import * as sst from "@serverless-stack/resources";

export default class %stack-name.PascalCased% extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src/Api",
      },
      routes: {
        "GET /": "Api::Api.Handlers::Handler",
      }
    });

    // Show the endpoint in the output
    this.addOutputs({
      "ApiEndpoint": api.url,
    });
  }
}
