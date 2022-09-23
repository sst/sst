import { Api, RDS, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  const DATABASE = "CounterDB";

  // Create the Aurora DB cluster
  const cluster = new RDS(stack, "Cluster", {
    engine: "postgresql11.13",
    defaultDatabaseName: DATABASE,
    migrations: "services/migrations",
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          DATABASE,
          CLUSTER_ARN: cluster.clusterArn,
          SECRET_ARN: cluster.secretArn,
        },
        permissions: [cluster],
      },
    },
    routes: {
      "POST /": "functions/lambda.handler",
    },
  });

  // Show the resource info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    SecretArn: cluster.secretArn,
    ClusterIdentifier: cluster.clusterIdentifier,
  });
}
