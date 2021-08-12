import * as lambda from "@aws-cdk/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create function
    const fn = new sst.Function(this, "Fn", {
      srcPath: "src/SampleFunction",
      handler: "SampleFunction::SampleFunction.Function::FunctionHandler",
    });

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src/Api",
      },
      routes: {
        "GET /": "Api::Api.Functions::GetBlogsAsync",
        "GET /{Id}": "Api::Api.Functions::GetBlogAsync",
      },
    });

    // Show API endpoint in output
    this.addOutputs({
      FunctionName: fn.functionName,
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
