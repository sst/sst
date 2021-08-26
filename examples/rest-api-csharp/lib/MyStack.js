import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src/Api",
      },
      routes: {
        "GET /notes": "Api::Api.Handlers::List",
        "GET /notes/{id}": "Api::Api.Handlers::Get",
        "PUT /notes/{id}": "Api::Api.Handlers::Update",
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
