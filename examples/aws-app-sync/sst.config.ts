/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-app-sync",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const table = new sst.aws.Dynamo("MyTable", {
      fields: {
        userId: "string",
      },
      primaryIndex: { hashKey: "userId" },
    });

    const api = new sst.aws.AppSync("MyApi", {
      schema: "schema.graphql",
      domain: "appsync.ion.sst.sh",
    });
    const lambdaDS = api.addDataSource({
      name: "lambda",
      lambda: "lambda.main",
    });
    const dynamoDS = api.addDataSource({ name: "dyanmo", dynamodb: table.arn });
    api.addResolver("Query license", { dataSource: lambdaDS.name });
    api.addResolver("Query user", {
      dataSource: dynamoDS.name,
      requestTemplate: `{
        "version": "2017-02-28",
        "operation": "Scan",
      }`,
      responseTemplate: `{
        "users": $utils.toJson($context.result.items)
      }`,
    });

    const apiKey = new aws.appsync.ApiKey("MyApiKey", {
      apiId: api.id,
    });
    return {
      API_KEY: apiKey.key,
    };
  },
});
