import * as sst from "@serverless-stack/resources";

export default class ApiStack extends sst.Stack {
  // Public reference to the API
  api;

  constructor(scope, id, props) {
    super(scope, id, props);

    const { table } = props;

    // Create the API
    this.api = new sst.Api(this, "Api", {
      customDomain: scope.stage === "prod" ? "notes-api.seed-demo.club" : undefined,
      defaultAuthorizationType: "AWS_IAM",
      defaultFunctionProps: {
        environment: {
          TABLE_NAME: table.tableName,
          STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        },
      },
      routes: {
        "GET    /notes": "src/list.main",
        "POST   /notes": "src/create.main",
        "GET    /notes/{id}": "src/get.main",
        "PUT    /notes/{id}": "src/update.main",
        "DELETE /notes/{id}": "src/delete.main",

        "POST   /billing": "src/billing.main",
      },
    });

    // Allow the API to access the table
    this.api.attachPermissions([table]);

    // Show the API endpoint in the output
    this.addOutputs({
      ApiEndpoint: this.api.customDomainUrl || this.api.url,
    });
  }
}
