import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        runtime: lambda.Runtime.PYTHON_3_8,
      },
      routes: {
        "GET /pip/a": { srcPath: "src-pip", handler: "handler.helloA" },
        "GET /pip/b": { srcPath: "src-pip", handler: "handler.helloB" },
        "GET /pipenv/a": { srcPath: "src-pipenv", handler: "handler.helloA" },
        "GET /pipenv/b": { srcPath: "src-pipenv", handler: "handler.helloB" },
        "GET /pipenv/c": {
          srcPath: "src-pipenv",
          handler: "sub/handler.hello",
        },
        "GET /poetry/a": { srcPath: "src-poetry", handler: "handler.helloA" },
        "GET /poetry/b": { srcPath: "src-poetry", handler: "handler.helloB" },
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
