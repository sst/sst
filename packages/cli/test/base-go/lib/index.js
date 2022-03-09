import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        runtime: lambda.Runtime.GO_1_X,
      },
      routes: {
        "GET /no-srcPath-no-filename": "src",
        "GET /no-srcPath-with-filename": "src/main.go",
        "GET /with-srcPath-no-filename": {
          srcPath: "src/sub",
          handler: "src",
        },
        "GET /with-srcPath-with-filename": {
          srcPath: "src/sub",
          handler: "src/main.go",
        },
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      ApiEndpoint: api.httpApi.apiEndpoint,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
