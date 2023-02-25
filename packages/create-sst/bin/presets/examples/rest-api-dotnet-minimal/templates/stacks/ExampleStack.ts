import { StackContext, Api } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  const api = new Api(stack, "api", {
    routes: {
      $default: {
        function: {
          architecture: "arm_64",
          handler: "minimal-api",
          runtime: "dotnet6",
        }
      }
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
