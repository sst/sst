import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const postgres = new sst.RDS(this, "Rds", {
      engine: "postgresql10.14",
      defaultDatabaseName: "acme",
      migrations: "src/rds/migrations/postgres",
    });

    const mysql56 = new sst.RDS(this, "Mysql56", {
      engine: "mysql5.6",
      defaultDatabaseName: "acme",
      migrations: "src/rds/migrations/mysql",
    });

    const mysql57 = new sst.RDS(this, "Mysql57", {
      engine: "mysql5.7",
      defaultDatabaseName: "acme",
      migrations: "src/rds/migrations/mysql",
    });

    this.addOutputs({
      PostgresSecretArn: postgres.secretArn,
      Mysql56SecretArn: mysql56.secretArn,
      Mysql57SecretArn: mysql57.secretArn,
    });
  }
}
