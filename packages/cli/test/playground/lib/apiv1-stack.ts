import * as apig from "aws-cdk-lib/aws-apigateway";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  public readonly api: sst.ApiGatewayV1Api;

  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    ////////////////////////
    // Creating a new API
    ////////////////////////
    const authorizerFn = new sst.Function(this, "MyAuthorizerFunction", {
      handler: "src/authorizer.main",
    });

    const api = new sst.ApiGatewayV1Api(this, "LegacyApi", {
      cors: true,
      accessLog: true,
      customDomain: "v1.sst.sh",
      //      customDomain: {
      //        domainName: "api.sst.sh",
      //        endpointType: apig.EndpointType.EDGE,
      //        path: "hello",
      //      },
      authorizers: {
        MyAuthorizer: {
          type: "lambda_request",
          function: authorizerFn,
          identitySources: [apig.IdentitySource.header("Authorization")],
        },
      },
      defaults: {
        functionProps: {
          environment: {
            TABLE_NAME: "dummy",
          },
        },
        authorizer: "MyAuthorizer",
      },
      routes: {
        "GET /": "src/lambda.main",
        "GET /sub": "src/lambda.main",
        "POST /sub": "src/lambda.main",
        "ANY /{proxy+}": "src/lambda.main",
      },
    });

    // Add header for BASIC auth
    api.cdk.restApi.addGatewayResponse("UNAUTHORIZED", {
      type: apig.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        "WWW-Authenticate": "'Basic realm=\"Secure Area\"'",
      },
    });

    ////////////////////////
    // Importing an existing API
    ////////////////////////
    //    new sst.ApiGatewayV1Api(this, "ImportedLegacyApi", {
    //      restApi: apig.RestApi.fromRestApiAttributes(this, "ILegacyApi", {
    //        restApiId: "kyeip55czf",
    //        rootResourceId: "8u8qrkncu1",
    //      }),
    //      importedPaths: {
    //        "/sub": "uu8oa4",
    //      },
    //      routes: {
    //        "GET /sub/child": "src/lambda.main",
    //      },
    //    });
  }
}
