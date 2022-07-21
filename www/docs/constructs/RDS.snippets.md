### Configuring the RDS cluster

You can configure the internally created CDK `ServerlessCluster` instance.

```js {7-9}
import * as cdk from "aws-cdk-lib";

new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: {
      backupRetention: cdk.Duration.days(7),
    },
  },
});
```

### Advanced examples

#### Import existing RDS Serverless v1 cluster

```js {7-14}
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";

new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: rds.ServerlessCluster.fromServerlessClusterAttributes(stack, "ICluster", {
      clusterIdentifier: "my-existing-cluster",
    }),
    secret: secretsManager.Secret.fromSecretAttributes(stack, "ISecret", {
      secretPartialArn: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
    }),
  },
});
```

Note that migrations are support for imported cluster. In order for migrations to work, make sure `engine` and `defaultDatabaseName` match the configuration of the imported cluster. You also need to import the secret credentials used by the cluster from the Secrets Manager.

#### Using existing VPC

The `RDS` construct automatically creates a VPC to deploy the cluster. This VPC contains only PRIVATE and ISOLATED subnets, without NAT Gateways.

:::note
Since we are using the Data API, you don't need to deploy your Lambda functions into the RDS's VPC.
:::

Yo can override the internally created `VPC` instance.

```js {7-14}
import * as ec2 from "aws-cdk-lib/aws-ec2";

new RDS(stack, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  cdk: {
    cluster: {  
      vpc: ec2.Vpc.fromLookup(this, "VPC", {
        vpcId: "vpc-xxxxxxxxxx",
      }),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE,
      },
    },
  },
});
```
