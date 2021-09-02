import * as lambda from "@aws-cdk/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src",
      },
      routes: {
        "GET /": "helloworld.App::handleRequest",
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      ApiEndpoint: api.httpApi.apiEndpoint,
    });
  }
}

export default function main(app) {
  app.setDefaultFunctionProps({
    runtime: lambda.Runtime.JAVA_11,
  });

  new MySampleStack(app, "sample");
}
