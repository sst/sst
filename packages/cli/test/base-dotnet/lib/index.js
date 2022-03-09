import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create function
    const csharpFn = new sst.Function(this, "CsharpFn", {
      srcPath: "src/CsharpFunction",
      handler: "CsharpFunction::CsharpFunction.Handlers::Handler",
    });

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src/Api",
      },
      routes: {
        "GET /": "Api::Api.Functions::GetBlogsAsync",
        "GET /{Id}": "Api::Api.Functions::GetBlogAsync",
        "GET /fsharp": {
          srcPath: "src/FsharpFunction",
          handler: "FsharpFunction::AwsDotnetFsharp.Handler::hello",
        },
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      CFunctionName: csharpFn.functionName,
      ApiEndpoint: api.httpApi.apiEndpoint,
    });
  }
}

export default function main(app) {
  app.setDefaultFunctionProps({
    runtime: lambda.Runtime.DOTNET_CORE_3_1,
  });

  new MySampleStack(app, "sample");
}
