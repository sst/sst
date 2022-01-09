import * as sst from "@serverless-stack/resources";
import { WebSocketLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const table = new sst.Table(this, "websocket-connections-table", {
      fields: {
        connection_id: sst.TableFieldType.STRING,
        user_id: sst.TableFieldType.STRING,
      },
      primaryIndex: {
        partitionKey: "connection_id",
      },
      secondaryIndexes: {
        userIdIndex: {
          partitionKey: "user_id",
        },
      },
    });

    const wsAuthorizerFn = new sst.Function(this, "ws-authorizer", {
      handler: "src/authorizer.main",
    });

    const api = new sst.WebSocketApi(this, "websocket-api", {
      customDomain: "ws.sst.sh",
      //authorizationType: sst.WebSocketApiAuthorizationType.NONE,
      authorizationType: sst.WebSocketApiAuthorizationType.CUSTOM,
      authorizer: new WebSocketLambdaAuthorizer(`LambdaAuthorizer`, wsAuthorizerFn),
      defaultFunctionProps: {
        runtime: "nodejs14.x",
        environment: {
          WEBSOCKET_CONNECTIONS_TABLE: table.dynamodbTable.tableName,
          //AUDIENCE: process.env.AUDIENCE!,
          //TOKEN_ISSUER: process.env.TOKEN_ISSUER!,
          //JWKS_URI: process.env.JWKS_URI!
        },
        permissions: [table],
      },
      routes: {
        //'$connect': "src/websockets/handlers/ConnectHandler.main",
        //'$disconnect': "src/websockets/handlers/DisconnectHandler.main",
        //'$default': "src/websockets/handlers/DefaultHandler.main",
        $connect: "src/lambda.main",
        $disconnect: "src/lambda.main",
        $default: "src/lambda.main",
        sendMessage: "src/lambda.main",
      },
    });

    this.addOutputs({
      URL: api.url,
      CustomDomainURL: api.customDomainUrl || api.url,
    });
  }
}
