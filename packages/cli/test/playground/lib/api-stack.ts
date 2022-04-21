import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as sst from "@serverless-stack/resources";

export function MainStack({ stack }: sst.StackContext) {
  new sst.Function(stack, "Func", {
    srcPath: "src",
    handler: "lambda.main",
  });

  new sst.Auth(stack, "Auth");

  new sst.Queue(stack, "MyQueue", {
    consumer: "src/lambda.main",
  });

  // Create Api with custom domain
  const api = new sst.Api(stack, "Api", {
    customDomain: "api.sst.sh",
    defaults: {
      function: {
        timeout: 10,
      },
    },
    routes: {
      "GET /": "src/lambda.main",
      "GET /leaf": "src/lambda.main",
      $default: "src/lambda.main",
    },
  });

  stack.addOutputs({
    Endpoint: api.url || "no-url",
    CustomEndpoint: api.customDomainUrl || "no-custom-url",
  });

  // Create Api without custom domain
  new sst.Api(stack, "NoDomain", {
    routes: {
      "GET /": "src/lambda.main",
    },
  });

  // Create Api with custom stages
  const customStageApi = new sst.Api(stack, "CustomStage", {
    cdk: {
      httpApi: {
        createDefaultStage: false,
      },
    },
    routes: {
      "GET /": "src/lambda.main",
    },
  });
  new apig.HttpStage(stack, "Stage", {
    httpApi: customStageApi.cdk.httpApi,
    stageName: "my-stage",
    autoDeploy: true,
  });

  return { api };
}
