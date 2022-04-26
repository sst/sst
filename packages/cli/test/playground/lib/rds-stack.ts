import * as sst from "@serverless-stack/resources";

export function MainStack({ stack }: sst.StackContext) {
  const postgres = new sst.RDS(stack, "Rds", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
    migrations: "src/rds/migrations/postgres",
  });

  //const mysql56 = new sst.RDS(stack, "Mysql56", {
  //  engine: "mysql5.6",
  //  defaultDatabaseName: "acme",
  //  migrations: "src/rds/migrations/mysql",
  //});

  //const mysql57 = new sst.RDS(stack, "Mysql57", {
  //  engine: "mysql5.7",
  //  defaultDatabaseName: "acme",
  //  migrations: "src/rds/migrations/mysql",
  //});

  stack.addOutputs({
    PostgresSecretArn: postgres.secretArn,
    //Mysql56SecretArn: mysql56.secretArn,
    //Mysql57SecretArn: mysql57.secretArn,
  });
}
