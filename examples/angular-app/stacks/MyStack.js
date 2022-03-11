import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create the table
    const table = new sst.Table(this, "Counter", {
      fields: {
        counter: sst.TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "counter" },
    });

    // Create the HTTP API
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

    // Show the API endpoint in the output
    const site = new sst.StaticSite(this, "AngularSite", {
      path: "frontend",
      buildOutput: "dist",
      buildCommand: "ng build --output-path dist",
      errorPage: sst.StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
      // To load the API URL from the environment in development mode (environment.ts)
      environment: {
        DEV_API_URL: api.url,
      },
      // To load the API URL from the environment in production mode (environment.prod.ts)
      replaceValues: [
        {
          files: "**/*.js",
          search: "{{ PROD_API_URL }}",
          replace: api.url,
        },
      ],
    });

    // Show the URLs in the output
    this.addOutputs({
      SiteUrl: site.url,
      ApiEndpoint: api.url,
    });
  }
}
