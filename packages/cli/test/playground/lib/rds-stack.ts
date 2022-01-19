import { RemovalPolicy } from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const rds = new sst.Rds(this, "Rds", {
      engine: "postgresql10.14",
      rdsServerlessCluster: {
        defaultDatabaseName: "acme",
      },
      migrations: {
        runner: {
          runtime: "nodejs14.x",
          handler: "src/rds/runner.main",
          environment: {
            RDS_DATABASE: "acme",
            RDS_MIGRATIONS_PATH: "src/rds/migrations",
          }
        },
        scripts: "src/rds/migrations"
      }
    });

    this.addOutputs({
      RdsArn: rds.clusterArn,
      SecretArn: rds.secretArn,
    });
  }
}
