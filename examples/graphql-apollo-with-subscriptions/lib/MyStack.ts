import * as sst from "@serverless-stack/resources";
import * as iam from "@aws-cdk/aws-iam";
import * as dynamodb from "@aws-cdk/aws-dynamodb";

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    /////////////////////
    // Tables
    /////////////////////

    // Create the Connections Table
    const connectionsTable = new sst.Table(this, "ConnectionsTable", {
      fields: { id: sst.TableFieldType.STRING },
      primaryIndex: { partitionKey: "id" },
      dynamodbTable: { timeToLiveAttribute: "ttl" },
    });

    // Create the Subscriptions Table
    const subscriptionsTable = new sst.Table(this, "SubscriptionsTable", {
      fields: {
        event: sst.TableFieldType.STRING,
        subscriptionId: sst.TableFieldType.STRING,
      },
      primaryIndex: {
        partitionKey: "event",
        sortKey: "subscriptionId",
      },
      dynamodbTable: { timeToLiveAttribute: "ttl" },
    });

    // Create the Subscription Operations Table
    const subscriptionOperationsTable = new sst.Table(
      this,
      "SubscriptionOperationsTable",
      {
        fields: { subscriptionId: sst.TableFieldType.STRING },
        primaryIndex: { partitionKey: "subscriptionId" },
        dynamodbTable: { timeToLiveAttribute: "ttl" },
      }
    );

    // Create the Events Table
    const eventsTable = new sst.Table(this, "EventsTable", {
      fields: { id: sst.TableFieldType.STRING },
      primaryIndex: { partitionKey: "id" },
      dynamodbTable: { timeToLiveAttribute: "ttl" },
      //-------------------------------------------------------------------------------------/
      // We have to use dynamodb because sst.Table doesn't (re)define all cdk.dynamodb's
      // types, like StreamViewType.
      //-------------------------------------------------------------------------------------/
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // Gather all Table names
    const tableNames = {
      CONNECTIONS_TABLE: connectionsTable.tableName,
      SUBSCRIPTIONS_TABLE: subscriptionsTable.tableName,
      SUBSCRIPTION_OPERATIONS_TABLE: subscriptionOperationsTable.tableName,
      EVENTS_TABLE: eventsTable.tableName,
    };

    // Gather all Tables
    const permissions = [
      connectionsTable,
      subscriptionsTable,
      subscriptionOperationsTable,
      eventsTable,
    ];

    /////////////////////
    // Functions
    /////////////////////

    // Create the HTTP handler Function
    const HTTPHandlerFunction = new sst.Function(this, "HTTPHandlerFunction", {
      handler: "src/lambda.handleHTTP",
      environment: tableNames,
      permissions: permissions,
    });

    // Create the WebSocket handler Function
    const WebSocketHandlerFunction = new sst.Function(
      this,
      "WebSocketHandlerFunction",
      {
        handler: "src/lambda.handleWebSocket",
        environment: tableNames,
        permissions: permissions,
      }
    );

    // Create the Events handler Function
    const EventsHandlerFunction = new sst.Function(
      this,
      "EventsHandlerFunction",
      {
        handler: "src/lambda.handleEvents",
        environment: tableNames,
        permissions: permissions,
      }
    );

    // Add Events handler Function as consumer to the Events table
    eventsTable.addConsumers(eventsTable, { events: EventsHandlerFunction });

    /////////////////////
    // APIs
    /////////////////////

    // Create the Apollo GraphQL API
    const apolloApi = new sst.ApolloApi(this, "ApolloApi", {
      server: HTTPHandlerFunction,
    });

    // Create the WebSocket API
    const websocketApi = new sst.WebSocketApi(this, "WebsocketApi", {
      routes: {
        $connect: WebSocketHandlerFunction,
        $disconnect: WebSocketHandlerFunction,
        sendmessage: WebSocketHandlerFunction,
      },
    });

    /////////////////////
    // QUICK FIXES
    /////////////////////

    // Add API endpoint URLs to Functions environments
    const apiEndpoints = {
      HTTP_API_ENDPOINT: apolloApi.url,
      WEBSOCKET_API_ENDPOINT: websocketApi.url,
    };

    Object.entries(apiEndpoints).forEach((apiEndpoint) => {
      apolloApi.serverFunction.addEnvironment(apiEndpoint[0], apiEndpoint[1]);
      WebSocketHandlerFunction.addEnvironment(apiEndpoint[0], apiEndpoint[1]);
    });

    // Add Events handler Function the ability to manage connections from the websocket API
    const connectionsArn = sst.Stack.of(this).formatArn({
      service: "execute-api",
      resourceName: `${scope.stage}/POST/*`,
      resource: websocketApi.webSocketApi.apiId,
    });

    EventsHandlerFunction.attachPermissions([
      //-------------------------------------------------------------------------------------/
      // We have to use iam because there is not predefined permission/grant for this.
      //-------------------------------------------------------------------------------------/
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [connectionsArn],
      }),
    ]);

    /////////////////////
    // Outputs
    /////////////////////

    // Show the API endpoints and Table names in the output
    this.addOutputs({
      ApolloApiEndpoint: apolloApi.url,
      WebSocketApiEndpoint: websocketApi.url,
      /*
      ConnectionsTableName: connectionsTable.tableName,
      SubscriptionsTableName: subscriptionsTable.tableName,
      SubscriptionOperationsTableName: subscriptionOperationsTable.tableName,
      EventsTableName: eventsTable.tableName,
      */
    });
  }
}
