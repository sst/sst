import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET /notes": "src/list.go",
        "GET /notes/{id}": "src/get.go",
        "PUT /notes/{id}": "src/update.go",
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
