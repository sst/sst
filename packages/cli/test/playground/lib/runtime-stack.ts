import * as sst from "@serverless-stack/resources";

export default function MainStack({ stack }: sst.StackContext) {
  const api = new sst.Api(stack, "Api", {
    routes: {
      "GET /csharp3": {
        function: {
          runtime: "dotnetcore3.1",
          srcPath: "src/csharp31",
          handler: "CsharpFunction::CsharpFunction.Handlers::Handler",
        }
      },
      "GET /csharp6": {
        function: {
          runtime: "dotnet6",
          srcPath: "src/csharp6",
          handler: "CsharpFunction::CsharpFunction.Handlers::Handler",
        }
      },
    },
  });

  stack.addOutputs({
    Endpoint: api.url!,
  });
}
