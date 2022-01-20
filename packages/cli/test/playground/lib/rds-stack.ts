import { RemovalPolicy } from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const rds = new sst.RDS(this, "Rds", {
      engine: "postgresql10.14",
      defaultDatabaseName: "acme",
      migrations: "src/rds/migrations",
    });

    this.addOutputs({
      RDSArn: rds.clusterArn,
      SecretArn: rds.secretArn,
    });
  }
}
