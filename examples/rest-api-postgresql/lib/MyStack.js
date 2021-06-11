import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const defaultDatabaseName = "CounterDB";

    // Create the VPC needed for the Aurora Serverless DB cluster
    const vpc = new ec2.Vpc(this, "CounterVPC");

    // Create the Serverless Aurora DB cluster
    const cluster = new rds.ServerlessCluster(this, "CounterDBCluster", {
      vpc,
      defaultDatabaseName,
      // Set the engine to Postgres
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(
        this,
        "ParameterGroup",
        "default.aurora-postgresql10"
      ),
      // Optional, disable the instance from pausing after 5 minutes
      scaling: { autoPause: cdk.Duration.seconds(0) },
    });

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      routes: {
        "POST /": {
          function: {
            handler: "src/lambda.handler",
            environment: {
              dbName: defaultDatabaseName,
              clusterArn: cluster.clusterArn,
              secretArn: cluster.secret.secretArn,
            },
          },
        },
      },
    });

    // Grant access to the cluster from the Lambda function
    cluster.grantDataApiAccess(api.getFunction("POST /"));

    // Show the resource info in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      SecretArn: cluster.secret.secretArn,
      ClusterIdentifier: cluster.clusterIdentifier,
    });
  }
}
