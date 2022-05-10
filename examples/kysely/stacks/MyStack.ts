import {
  Api,
  Function,
  KinesisStream,
  RDS,
  StackContext,
} from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  const rds = new RDS(stack, "rds", {
    engine: "postgresql10.14",
    defaultDatabaseName: "mydatabase",
  });

  const func = new Function(stack, "func", {
    permissions: [rds],
    handler: "functions/rds.handler",
    environment: {
      RDS_SECRET_ARN: rds.secretArn,
      RDS_ARN: rds.clusterArn,
      RDS_DATABASE: rds.defaultDatabaseName,
    },
  });
}
