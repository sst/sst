import { test, expect, vi } from "vitest";
import {
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
  stringLike,
  printResource,
} from "./helper";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { App, RDS, Stack, Table, AppSyncApi, Function } from "../src";

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
  expect(api.apiId).toBeDefined();
  expect(api.apiArn).toBeDefined();
  expect(api.apiName).toBeDefined();
  expect(api.url).toBeDefined();
  expect(api.customDomainUrl).toBeUndefined();
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
    cdk: {
      graphqlApi: {
        schema: appsync.Schema.fromAsset("test/appsync/schema.graphql"),
        xrayEnabled: false,
      },
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
    schema: "test/appsync/schema.graphql",
  });
  hasResource(stack, "AWS::AppSync::GraphQLSchema", {
    Definition: stringLike(/hello: String/),
  });
});

test("constructor: graphqlApi is props: schema is string[]", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    schema: ["test/appsync/schema.graphql", "test/appsync/schema2.graphql"],
  });
  hasResource(stack, "AWS::AppSync::GraphQLSchema", {
    Definition: stringLike(/hello: String\r?\n\s*world: String/),
  });
});

test("constructor: graphqlApi is construct", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    cdk: {
      graphqlApi: new appsync.GraphqlApi(stack, "GraphqlApi", {
        name: "existing-api",
      }),
    },
  });
  hasResource(stack, "AWS::AppSync::GraphQLApi", {
    Name: "existing-api",
  });
});

test("constructor: graphqlApi is imported", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    cdk: {
      graphqlApi: appsync.GraphqlApi.fromGraphqlApiAttributes(
        stack,
        "IGraphqlApi",
        {
          graphqlApiId: "abc",
        }
      ),
    },
  });
  countResources(stack, "AWS::AppSync::GraphQLApi", 0);
});

test("customDomain is string", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new AppSyncApi(stack, "Api", {
    customDomain: "api.domain.com",
  });
  expect(api.customDomainUrl).toMatch(/https:\/\/api.domain.com/);
  expect(api.cdk.certificate).toBeDefined();
  hasResource(stack, "AWS::AppSync::GraphQLApi", {
    Name: "dev-api-Api",
  });
  hasResource(stack, "AWS::AppSync::DomainName", {
    DomainName: "api.domain.com",
  });
  hasResource(stack, "AWS::AppSync::DomainNameApiAssociation", {
    DomainName: "api.domain.com",
  });
  hasResource(stack, "AWS::CertificateManager::Certificate", {
    DomainName: "api.domain.com",
    ValidationMethod: "DNS",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "CNAME",
    ResourceRecords: [
      {
        "Fn::GetAtt": ["ApiDomainNameF7396156", "AppSyncDomainName"],
      },
    ],
    HostedZoneId: { Ref: "ApiHostedZone826B96E5" },
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain is string (uppercase error)", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      customDomain: "API.domain.com",
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("customDomain is string (imported ssm)", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      customDomain: domain,
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("customDomain.domainName is string", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new AppSyncApi(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      hostedZone: "api.domain.com",
    },
  });
  hasResource(stack, "AWS::AppSync::GraphQLApi", {
    Name: "dev-api-Api",
  });
  hasResource(stack, "AWS::AppSync::DomainName", {
    DomainName: "api.domain.com",
  });
  hasResource(stack, "AWS::CertificateManager::Certificate", {
    DomainName: "api.domain.com",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "CNAME",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "api.domain.com.",
  });
});

test("customDomain.domainName is string (uppercase error)", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      customDomain: {
        domainName: "API.domain.com",
      },
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("customDomain.domainName is string (imported ssm), hostedZone undefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      customDomain: {
        domainName: domain,
      },
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("customDomain: isExternalDomain true", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const api = new AppSyncApi(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      isExternalDomain: true,
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    },
  });
  expect(api.customDomainUrl).toEqual("https://api.domain.com/graphql");
  hasResource(stack, "AWS::AppSync::GraphQLApi", {
    Name: "dev-api-Api",
  });
  hasResource(stack, "AWS::AppSync::DomainName", {
    DomainName: "api.domain.com",
  });
});

test("customDomain: isExternalDomain true and no certificate", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new AppSyncApi(stack, "Site", {
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
    });
  }).toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain true and hostedZone set", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new AppSyncApi(stack, "Site", {
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
        hostedZone: "domain.com",
        cdk: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
      },
    });
  }).toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("customDomain.domainName is string (imported ssm), hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  new AppSyncApi(stack, "Api", {
    customDomain: {
      domainName: domain,
      hostedZone: "domain.com",
    },
  });

  hasResource(stack, "AWS::AppSync::DomainName", {
    DomainName: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
    Type: "CNAME",
  });
});

test("customDomain.hostedZone-generated-from-minimal-domainName", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new AppSyncApi(stack, "Api", {
    customDomain: "api.domain.com",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain.hostedZone-generated-from-full-domainName", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new AppSyncApi(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
    },
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain props-redefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      customDomain: "api.domain.com",
      cdk: {
        graphqlApi: new appsync.GraphqlApi(stack, "GraphQLApi", {
          name: "Api",
        }),
      },
    });
  }).toThrow(
    /Cannot configure the "customDomain" when "graphqlApi" is a construct/
  );
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

test("dataSources-FunctionDefinition-with-defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    defaults: {
      function: {
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

test("dataSources-FunctionDefinition-construct-with-defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new AppSyncApi(stack, "Api", {
      dataSources: {
        lambdaDS: f,
      },
      defaults: {
        function: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/Cannot define defaults.function/);
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

test("dataSources-LambdaDataSource-with-defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
      },
    },
    defaults: {
      function: {
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

test("dataSources-LambdaDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: {
        function: "test/lambda.handler",
        name: "My Lambda DS",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "MyLambdaDS",
    Type: "AWS_LAMBDA",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("dataSources-DynamoDbDataSource-sstTable", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: { id: "string" },
    primaryIndex: { partitionKey: "id" },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: {
        type: "dynamodb",
        table,
      },
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
      dbDS: {
        type: "dynamodb",
        cdk: {
          dataSource: {
            table,
          },
        },
      },
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
    fields: { id: "string" },
    primaryIndex: { partitionKey: "id" },
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      dbDS: {
        type: "dynamodb",
        table,
        name: "My DB DS",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "MyDBDS",
    Type: "AMAZON_DYNAMODB",
  });
  countResources(stack, "AWS::DynamoDB::Table", 1);
});

test("dataSources-RdsDataSource-sstRds", async () => {
  const stack = new Stack(new App(), "stack");
  const rds = new RDS(stack, "Database", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      rdsDS: {
        type: "rds",
        rds,
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

test("dataSources-RdsDataSource-rdsServerlessCluster", async () => {
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
        type: "rds",
        cdk: {
          dataSource: {
            serverlessCluster: cluster,
            secretStore: cluster.secret as secretsmanager.ISecret,
          },
        },
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
  const rds = new RDS(stack, "Database", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
  });
  new AppSyncApi(stack, "Api", {
    dataSources: {
      rdsDS: {
        type: "rds",
        rds,
        name: "My RDS DS",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "MyRDSDS",
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
        type: "http",
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
        type: "http",
        endpoint: "https://google.com",
        name: "My HTTP DS",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "MyHTTPDS",
    Type: "HTTP",
    HttpConfig: {
      Endpoint: "https://google.com",
    },
  });
});

test("dataSources-NoneDataSource", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      noneDS: {
        type: "none",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "noneDS",
    Type: "NONE",
  });
});

test("dataSources-NoneDataSource-with-options", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      noneDS: {
        type: "none",
        name: "My NONE DS",
      },
    },
  });
  countResources(stack, "AWS::AppSync::DataSource", 1);
  hasResource(stack, "AWS::AppSync::DataSource", {
    Name: "MyNONEDS",
    Type: "NONE",
  });
});

test("resolvers: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api");
  countResources(stack, "AWS::AppSync::Resolver", 0);
});

test("resolvers: empty", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {},
  });
  countResources(stack, "AWS::AppSync::Resolver", 0);
});

test("resolvers: invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "Query / 1 2 3": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid resolver Query \/ 1 2 3/);
});

test("resolvers: invalid-field", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "Query ": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid field defined for "Query "/);
});

test("resolvers: is datasource string", async () => {
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

test("resolvers: is datasource string not exist error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new AppSyncApi(stack, "Api", {
      resolvers: {
        "Query notes": "lambdaDS",
      },
    });
  }).toThrow(/Failed to create resolver/);
});

test("resolvers: is FunctionDefinition", async () => {
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

test("resolvers: is FunctionDefinition with defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": "test/lambda.handler",
      "Mutation notes": "test/lambda.handler",
    },
    defaults: {
      function: {
        timeout: 3,
      },
    },
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("resolvers: is datasource props: datasource is string", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    resolvers: {
      "Query notes": {
        dataSource: "lambdaDS",
        requestMapping: {
          inline: '{"version" : "2017-02-28", "operation" : "Scan"}',
        },
        responseMapping: {
          inline: "$util.toJson($ctx.result.items)",
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

  // TODO
  printResource(stack, "AWS::AppSync::Resolver");

  hasResource(stack, "AWS::AppSync::Resolver", {
    FieldName: "notes",
    TypeName: "Query",
    DataSourceName: "lambdaDS",
    Kind: "UNIT",
    RequestMappingTemplate: '{"version" : "2017-02-28", "operation" : "Scan"}',
    ResponseMappingTemplate: "$util.toJson($ctx.result.items)",
  });
});

test("resolvers: is datasource props: datasource is string with resolverProps", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    dataSources: {
      lambdaDS: "test/lambda.handler",
    },
    resolvers: {
      "Query notes": {
        dataSource: "lambdaDS",
        cdk: {
          resolver: {
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
            responseMappingTemplate:
              appsync.MappingTemplate.dynamoDbResultList(),
          },
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
    RequestMappingTemplate: '{"version" : "2017-02-28", "operation" : "Scan"}',
    ResponseMappingTemplate: "$util.toJson($ctx.result.items)",
  });
});

test("resolvers: is datasource props: datasource is FunctionDefinition", async () => {
  const stack = new Stack(new App(), "stack");
  new AppSyncApi(stack, "Api", {
    resolvers: {
      "Query notes": {
        function: "test/lambda.handler",
        cdk: {
          resolver: {
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
            responseMappingTemplate:
              appsync.MappingTemplate.dynamoDbResultList(),
          },
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
    RequestMappingTemplate: '{"version" : "2017-02-28", "operation" : "Scan"}',
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
