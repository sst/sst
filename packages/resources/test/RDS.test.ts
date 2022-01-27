/* eslint-disable @typescript-eslint/ban-ts-comment*/

import {
  countResources,
  hasResource,
} from "./helper";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { App, Stack, RDS, RDSProps } from "../src";

/////////////////////////////
// Test constructor
/////////////////////////////

test("constructor: rdsServerlessCluster is props", async () => {
  const stack = new Stack(new App(), "stack");
  const cluster = new RDS(stack, "Cluster", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
    rdsServerlessCluster: {
      backupRetention: cdk.Duration.days(7),
    },
  });
  expect(cluster.clusterArn).toBeDefined();
  expect(cluster.clusterIdentifier).toBeDefined();
  expect(cluster.clusterEndpoint).toBeDefined();
  hasResource(stack, "AWS::RDS::DBCluster", {
    Engine: "aurora-postgresql",
    DatabaseName: "acme",
    DBClusterIdentifier: "dev-my-app-cluster",
    EnableHttpEndpoint: true,
    EngineMode: "serverless",
    EngineVersion: "10.14",
    BackupRetentionPeriod: 7,
  });
});

test("constructor: rdsServerlessCluster contains engine error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() =>
    // @ts-ignore Allow type casting
    new RDS(stack, "Cluster", {
      engine: "postgresql10.14",
      defaultDatabaseName: "acme",
      rdsServerlessCluster: {
        engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      },
    } as RDSProps)
  ).toThrow(/Use "engine" instead of "rdsServerlessCluster.engine"/);
});

test("constructor: rdsServerlessCluster contains defaultDatabaseName error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() =>
    // @ts-ignore Allow type casting
    new RDS(stack, "Cluster", {
      engine: "postgresql10.14",
      defaultDatabaseName: "acme",
      rdsServerlessCluster: {
        defaultDatabaseName: "acme",
      },
    } as RDSProps)
  ).toThrow(/Use "defaultDatabaseName" instead of "rdsServerlessCluster.defaultDatabaseName"/);
});

test("constructor: rdsServerlessCluster contains enableDataApi error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() =>
    // @ts-ignore Allow type casting
    new RDS(stack, "Cluster", {
      engine: "postgresql10.14",
      defaultDatabaseName: "acme",
      rdsServerlessCluster: {
        enableDataApi: false,
      },
    } as RDSProps)
  ).toThrow(/Do not configure the "rdsServerlessCluster.enableDataApi"/);
});

test("constructor: defaultDatabaseName missing", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() =>
    // @ts-ignore Allow type casting
    new RDS(stack, "Cluster", {
      engine: "postgresql10.14",
    } as RDSProps)
  ).toThrow(/Missing "defaultDatabaseName"/);
});

test("constructor: engine missing", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() =>
    // @ts-ignore Allow type casting
    new RDS(stack, "Cluster", {
      defaultDatabaseName: "acme",
    } as RDSProps)
  ).toThrow(/Missing "engine"/);
});

test("constructor: engine invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() =>
    // @ts-ignore Allow type casting
    new RDS(stack, "Cluster", {
      engine: "invalid",
      defaultDatabaseName: "acme",
    } as RDSProps)
  ).toThrow(/The specified "engine" is not supported/);
});

test("constructor: engine postgresql10.14", async () => {
  const stack = new Stack(new App(), "stack");
  new RDS(stack, "Cluster", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
  });
  hasResource(stack, "AWS::RDS::DBCluster", {
    Engine: "aurora-postgresql",
    EngineMode: "serverless",
    EngineVersion: "10.14",
  });
});

test("constructor: engine mysql5.6", async () => {
  const stack = new Stack(new App(), "stack");
  new RDS(stack, "Cluster", {
    engine: "mysql5.6",
    defaultDatabaseName: "acme",
  });
  hasResource(stack, "AWS::RDS::DBCluster", {
    Engine: "aurora",
    EngineMode: "serverless",
    EngineVersion: "5.6.10a",
  });
});

test("constructor: engine mysql5.7", async () => {
  const stack = new Stack(new App(), "stack");
  new RDS(stack, "Cluster", {
    engine: "mysql5.7",
    defaultDatabaseName: "acme",
  });
  hasResource(stack, "AWS::RDS::DBCluster", {
    Engine: "aurora-mysql",
    EngineMode: "serverless",
    EngineVersion: "5.7.mysql_aurora.2.07.1",
  });
});

test("constructor: migrations", async () => {
  const stack = new Stack(new App(), "stack");
  new RDS(stack, "Cluster", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
    migrations: "test/rds/migrations",
  })
});

test("constructor: migrations not found", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() =>
    new RDS(stack, "Cluster", {
      engine: "postgresql10.14",
      defaultDatabaseName: "acme",
      migrations: "test/rds/does/not/exist",
    })
  ).toThrow(/Cannot find the migrations/);
});

test("constructor: vpc not provided", async () => {
  const stack = new Stack(new App(), "stack");
  new RDS(stack, "Cluster", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
  });
  countResources(stack, "AWS::EC2::VPC", 1);
});

test("constructor: vpc provided", async () => {
  const stack = new Stack(new App(), "stack");
  new RDS(stack, "Cluster", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme",
    rdsServerlessCluster: {
      vpc: ec2.Vpc.fromVpcAttributes(stack, "VPC", {
        availabilityZones: ["us-east-1a"],
        publicSubnetIds: ["{PUBLIC-SUBNET-ID}"],
        privateSubnetIds: ["{PRIVATE-SUBNET-ID}"],
        isolatedSubnetIds: ["{ISOLATED-SUBNET-ID}"],
        vpcId: "{VPC-ID}",
      }),
    },
  });
  countResources(stack, "AWS::EC2::VPC", 0);
});
