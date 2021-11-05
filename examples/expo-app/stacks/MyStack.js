import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const table = new sst.Table(this, "CounterExpo", {
      fields: {
        counter: sst.TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "counter" },
    });

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        // Pass in the table name to our API
        environment: {
          tableName: table.dynamodbTable.tableName,
        },
      },
      routes: {
        "POST /": "src/lambda.main",
      },
    });

    // Allow the API to access the table
    api.attachPermissions([table]);

    // Show the URLs in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
