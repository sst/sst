import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src",
      },
      routes: {
        "GET /notes": "list.main",
        "GET /notes/{id}": "get.main",
        "PUT /notes/{id}": "update.main",
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
