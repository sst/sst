import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const DATABASE = "CounterDB";

    // Create the Aurora DB cluster
    const cluster = new sst.RDS(this, "Cluster", {
      engine: "postgresql10.14",
      defaultDatabaseName: DATABASE,
      migrations: "src/migrations",
    });

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        environment: {
          DATABASE,
          CLUSTER_ARN: cluster.clusterArn,
          SECRET_ARN: cluster.secretArn,
        },
        permissions: [cluster],
      },
      routes: {
        "POST /": "src/lambda.handler",
      },
    });

    // Show the resource info in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      SecretArn: cluster.secretArn,
      ClusterIdentifier: cluster.clusterIdentifier,
    });
  }
}
