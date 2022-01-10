import {
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
  stringLike,
} from "./helper";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import {
  App,
  Stack,
  Table,
  TableFieldType,
  AppSyncApi,
  Function,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("constructor: graphqlApi is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {});
  expect(api.url).toBeDefined();
  hasResource(stack, "AWS::AppSync::GraphQLApi", {
    AuthenticationType: "API_KEY",
    Name: "dev-my-app-Api",
    XrayEnabled: true,
  });
  hasResource(stack, "AWS::AppSync::GraphQLSchema", {
    Definition: "",
  });
  countResources(stack, "AWS::AppSync::ApiKey", 1);
  countResources(stack, "AWS::AppSync::DataSource", 0);
  countResources(stack, "AWS::AppSync::Resolver", 0);
});

test("constructor: graphqlApi is props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: {
      schema: appsync.Schema.fromAsset("test/appsync/schema.graphql"),
      xrayEnabled: false,
    },
  });
  hasResource(stack, "AWS::AppSync::GraphQLApi", {
    AuthenticationType: "API_KEY",
    Name: "dev-my-app-Api",
    XrayEnabled: false,
  });
  hasResource(stack, "AWS::AppSync::GraphQLSchema", {
    Definition: stringLike(/hello: String/),
  });
});

test("constructor: graphqlApi is props: schema is string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: {
      schema: "test/appsync/schema.graphql",
    },
  });
  hasResource(stack, "AWS::AppSync::GraphQLSchema", {
    Definition: stringLike(/hello: String/),
  });
});

test("constructor: graphqlApi is props: schema is string[]", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: {
      schema: ["test/appsync/schema.graphql", "test/appsync/schema2.graphql"],
    },
  });
  hasResource(stack, "AWS::AppSync::GraphQLSchema", {
    Definition: stringLike(/hello: String\r?\n\s*world: String/),
  });
});

test("constructor: graphqlApi is construct", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: new appsync.GraphqlApi(stack, "GraphqlApi", {
      name: "existing-api",
    }),
  });
  hasResource(stack, "AWS::AppSync::GraphQLApi", {
    Name: "existing-api",
  });
});

test("constructor: graphqlApi is imported", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    graphqlApi: appsync.GraphqlApi.fromGraphqlApiAttributes(
      stack,
      "IGraphqlApi",
      {
        graphqlApiId: "abc",
      }
    ),
  });
  countResources(stack, "AWS::AppSync::GraphQLApi", 0);
});

test("dataSources-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api");
  countResources(stack, "AWS::AppSync::DataSource", 0);
});

test("dataSources-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {},
  });
  countResources(stack, "AWS::AppSync::DataSource", 0);
});

test("dataSources-FunctionDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "lambdaDS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("dataSources-FunctionDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        handler: "test/lambda.handler",
        timeout: 3,
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "lambdaDS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("dataSources-FunctionDefinition-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "lambdaDS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("dataSources-FunctionDefinition-construct-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new AppSyncApi(stack, "Api", {
      dataSources: {
        lambdaDS: f,
      },
      defaultFunctionProps: {
        timeout: 3,
      },
    });
  }).toThrow(/Cannot define defaultFunctionProps/);
});

test("dataSources-LambdaDataSource-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "lambdaDS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("dataSources-LambdaDataSource-props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: {
          handler: "test/lambda.handler",
          timeout: 3,
        },
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "lambdaDS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("dataSources-LambdaDataSource-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "lambdaDS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("dataSources-LambdaDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
        options: {
          name: "My Lambda DS",
        },
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "My Lambda DS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("dataSources-DynamoDbDataSource-sstTable", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: { id: TableFieldType.STRING },
    primaryIndex: { partitionKey: "id" },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: { table },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "dbDS",
    Type: "AMAZON_DYNAMODB",
  });
  countResources(stack, "AWS::DynamoDB::Table", 1);
});

test("dataSources-DynamoDbDataSource-dynamodbTable", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new dynamodb.Table(stack, "Table", {
    partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: { table },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "dbDS",
    Type: "AMAZON_DYNAMODB",
  });
  countResources(stack, "AWS::DynamoDB::Table", 1);
});

test("dataSources-DynamoDbDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: { id: TableFieldType.STRING },
    primaryIndex: { partitionKey: "id" },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: {
        table,
        options: {
          name: "My DB DS",
        },
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "My DB DS",
    Type: "AMAZON_DYNAMODB",
  });
  countResources(stack, "AWS::DynamoDB::Table", 1);
});

test("dataSources-RdsDataSource", async () => {
  const stack = new Stack(new App(), "stack");
  const cluster = new rds.ServerlessCluster(stack, "Database", {
    engine: rds.DatabaseClusterEngine.auroraMysql({
      version: rds.AuroraMysqlEngineVersion.VER_2_08_1,
    }),
    vpc: new ec2.Vpc(stack, "VPC"),
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      rdsDS: {
        serverlessCluster: cluster,
        secretStore: cluster.secret as secretsmanager.ISecret,
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "rdsDS",
    Type: "RELATIONAL_DATABASE",
    RelationalDatabaseConfig: objectLike({
      RelationalDatabaseSourceType: "RDS_HTTP_ENDPOINT",
    }),
  });
  countResources(stack, "AWS::RDS::DBCluster", 1);
});

test("dataSources-RdsDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  const cluster = new rds.ServerlessCluster(stack, "Database", {
    engine: rds.DatabaseClusterEngine.auroraMysql({
      version: rds.AuroraMysqlEngineVersion.VER_2_08_1,
    }),
    vpc: new ec2.Vpc(stack, "VPC"),
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      rdsDS: {
        serverlessCluster: cluster,
        secretStore: cluster.secret as secretsmanager.ISecret,
        options: {
          name: "My RDS DS",
        },
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "My RDS DS",
    Type: "RELATIONAL_DATABASE",
    RelationalDatabaseConfig: objectLike({
      RelationalDatabaseSourceType: "RDS_HTTP_ENDPOINT",
    }),
  });
  countResources(stack, "AWS::RDS::DBCluster", 1);
});

test("dataSources-HttpDataSource", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      httpDS: {
        endpoint: "https://google.com",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "httpDS",
    Type: "HTTP",
    HttpConfig: {
      Endpoint: "https://google.com",
    },
  });
});

test("dataSources-HttpDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      httpDS: {
        endpoint: "https://google.com",
        options: {
          name: "My HTTP DS",
        },
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "My HTTP DS",
    Type: "HTTP",
    HttpConfig: {
      Endpoint: "https://google.com",
    },
  });
});

test("resolvers-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api");
  countResources(stack, "AWS::AppSync::Resolver", 0);
});

test("resolvers-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {},
  });
  countResources(stack, "AWS::AppSync::Resolver", 0);
});

test("resolvers-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "Query / 1 2 3": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid resolver Query \/ 1 2 3/);
});

test("resolvers-invalid-field", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "Query ": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid field defined for "Query "/);
});

test("resolvers-datasource-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    resolvers: {
      "Query notes": "lambdaDS",
      "Mutation notes": "lambdaDS",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::AppSync::DataSource", 1);
  countResources(stack, "AWS::AppSync::Resolver", 2);
  hasResource(stack, "AWS::AppSync::Resolver", {
    FieldName: "notes",
    TypeName: "Query",
    DataSourceName: "lambdaDS",
    Kind: "UNIT",
  });
  hasResource(stack, "AWS::AppSync::Resolver", {
    FieldName: "notes",
    TypeName: "Mutation",
    DataSourceName: "lambdaDS",
    Kind: "UNIT",
  });
});

test("resolvers-datasource-not-exist-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "Query notes": "lambdaDS",
      },
    });
  }).toThrow(/Failed to create resolver/);
});

test("resolvers-FunctionDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Mutation notes": "test/lambda.handler",
    },
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::AppSync::DataSource", 2);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "LambdaDS_Query_notes",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "LambdaDS_Mutation_notes",
    Type: "AWS_LAMBDA",
  });
  countResources(stack, "AWS::AppSync::Resolver", 2);
  hasResource(stack, "AWS::AppSync::Resolver", {
    FieldName: "notes",
    TypeName: "Query",
    DataSourceName: "LambdaDS_Query_notes",
    Kind: "UNIT",
  });
  hasResource(stack, "AWS::AppSync::Resolver", {
    FieldName: "notes",
    TypeName: "Mutation",
    DataSourceName: "LambdaDS_Mutation_notes",
    Kind: "UNIT",
  });
});

test("resolvers-FunctionDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": {
        handler: "test/lambda.handler",
      },
      "Mutation notes": {
        handler: "test/lambda.handler",
      },
    },
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
  });
});

test("resolvers-FunctionDefinition-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Mutation notes": "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("resolvers-ResolverProps-with-datasource-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    resolvers: {
      "Query notes": {
        dataSource: "lambdaDS",
        resolverProps: {
          requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
          responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
        },
      },
    },
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 1, {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "lambdaDS",
    Type: "AWS_LAMBDA",
  });
  countResources(stack, "AWS::AppSync::Resolver", 1);
  hasResource(stack, "AWS::AppSync::Resolver", {
    FieldName: "notes",
    TypeName: "Query",
    DataSourceName: "lambdaDS",
    Kind: "UNIT",
    RequestMappingTemplate:
      '{"version" : "2017-02-28", "operation" : "Scan"}',
    ResponseMappingTemplate: "$util.toJson($ctx.result.items)",
  });
});

test("resolvers-ResolverProps-with-FunctionDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": {
        function: "test/lambda.handler",
        resolverProps: {
          requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
          responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
        },
      },
    },
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 1, {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "LambdaDS_Query_notes",
    Type: "AWS_LAMBDA",
  });
  countResources(stack, "AWS::AppSync::Resolver", 1);
  hasResource(stack, "AWS::AppSync::Resolver", {
    FieldName: "notes",
    TypeName: "Query",
    DataSourceName: "LambdaDS_Query_notes",
    Kind: "UNIT",
    RequestMappingTemplate:
      '{"version" : "2017-02-28", "operation" : "Scan"}',
    ResponseMappingTemplate: "$util.toJson($ctx.result.items)",
  });
});

///////////////////
// Test Methods
///////////////////

test("getDataSource-datasource-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDs: "test/lambda.handler",
    },
  });
  expect(api.getDataSource("lambdaDs")).toBeDefined();
  expect(api.getDataSource("lambdaDs2")).toBeUndefined();
});

test("getDataSource-resolver-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
    },
  });
  expect(api.getDataSource("Query notes")).toBeDefined();
  expect(api.getDataSource("Query  notes")).toBeDefined();
  expect(api.getDataSource("Query notes2")).toBeUndefined();
});

test("getFunction-dataSource-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDs: "test/lambda.handler",
    },
  });
  expect(api.getFunction("lambdaDs")).toBeDefined();
  expect(api.getFunction("lambdaDs2")).toBeUndefined();
});

test("getFunction-resolver-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
    },
  });
  expect(api.getFunction("Query notes")).toBeDefined();
  expect(api.getFunction("Query  notes")).toBeDefined();
  expect(api.getFunction("Query notes2")).toBeUndefined();
});

test("getResolver", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
    },
  });
  expect(api.getResolver("Query notes")).toBeDefined();
  expect(api.getResolver("Query  notes")).toBeDefined();
  expect(api.getResolver("Query notes2")).toBeUndefined();
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Query notes2": "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  countResourcesLike(stack, "AWS::IAM::Policy", 2, {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissionsToDataSource-dataSource-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
      lambdaDS2: "test/lambda.handler",
    },
  });
  api.attachPermissionsToDataSource("lambdaDS", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissionsToDataSource-resolver-key", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Query notes2": "test/lambda.handler",
    },
  });
  api.attachPermissionsToDataSource("Query notes", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions-after-addResolvers", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const api = new AppSyncApi(stackA, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Query notes2": "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  api.addResolvers(stackB, {
    "Query notes3": "test/lambda.handler",
  });
  countResourcesLike(stackA, "AWS::IAM::Policy", 2, {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
  countResourcesLike(stackB, "AWS::IAM::Policy", 1, {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});
