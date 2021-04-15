import * as sst from "@serverless-stack/resources";
import { Table, TableFieldType } from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const table = new Table(this, "websocket-connections-table", {
      fields: {
        connection_id: TableFieldType.STRING,
        user_id: TableFieldType.STRING,
      },
      primaryIndex: {
        partitionKey: "connection_id",
      },
      secondaryIndexes: {
        userIdIndex: {
          partitionKey: "user_id",
        }
      }
    })

    const api = new sst.WebSocketApi(this, "websocket-api", {
      customDomain: "ws.sst.sh",
      authorizationType: sst.WebSocketApiAuthorizationType.NONE,
      defaultFunctionProps: {
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
        '$connect': "src/lambda.main",
        '$disconnect': "src/lambda.main",
        '$default': "src/lambda.main",
      },
    });

    this.addOutputs({
      Endpoint: api.url,
    });
  }
}
