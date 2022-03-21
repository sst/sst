---
description: "Docs for the sst.RDS construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `RDS` construct is a higher level CDK construct that makes it easy to create an [RDS Serverless Cluster](https://aws.amazon.com/rds/). It uses the following defaults:

- Defaults to using the [Serverless v1 On-Demand autoscaling configuration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html) to make it serverless.
- Provides a built-in interface for running schema migrations using [Kysely](https://koskimas.github.io/kysely/#migrations).
- Enables [Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) to allow your Lambda functions to access the database cluster without needing to deploy the functions in a VPC (virtual private cloud).
- Enables [Backup Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/BackupRestoreAurora.html) to make sure that you don't lose your data.


## Constructor
```ts
new RDS(scope: Construct, id: string, props: RDSProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`RDSProps`](#rdsprops)

## Examples

### Using the minimal config

```js
import { RDS } from "@serverless-stack/resources";

new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "my_database",
});
```


## Properties
An instance of `RDS` has the following properties.

### cdk.cluster

_Type_ : [`ServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ServerlessCluster.html)

The ARN of the internally created CDK ServerlessCluster instance.


### clusterArn

_Type_ : `string`

The ARN of the internally created CDK `ServerlessCluster` instance.

### clusterEndpoint

_Type_ : [`Endpoint`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Endpoint.html)

The ARN of the internally created CDK ServerlessCluster instance.

### clusterIdentifier

_Type_ : `string`

The ARN of the internally created CDK ServerlessCluster instance.

### defaultDatabaseName

_Type_ : `string`

### migratorFunction?

_Type_ : [`Function`](Function)

The ARN of the internally created CDK ServerlessCluster instance.

### secretArn

_Type_ : `string`

The ARN of the internally created CDK ServerlessCluster instance.

## RDSCdkServerlessClusterProps


### backupRetention?

_Type_ : [`Duration`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html)

_Default_ : `Duration.days(1)
`

The number of days during which automatic DB snapshots are retained.
Automatic backup retention cannot be disabled on serverless clusters.
Must be a value from 1 day to 35 days.

### clusterIdentifier?

_Type_ : `string`

_Default_ : `- A name is automatically generated.
`

An optional identifier for the cluster

### credentials?

_Type_ : [`Credentials`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Credentials.html)

_Default_ : `- A username of 'admin' and SecretsManager-generated password
`

Credentials for the administrative user

### deletionProtection?

_Type_ : `boolean`

_Default_ : `- true if removalPolicy is RETAIN, false otherwise
`

Indicates whether the DB cluster should have deletion protection enabled.

### enableDataApi?

_Type_ : `boolean`

_Default_ : `false
`

Whether to enable the Data API.

https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html

### parameterGroup?

_Type_ : [`IParameterGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IParameterGroup.html)

_Default_ : `- no parameter group.
`

Additional parameters to pass to the database engine

### removalPolicy?

_Type_ : [`RemovalPolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RemovalPolicy.html)

_Default_ : `- RemovalPolicy.SNAPSHOT (remove the cluster and instances, but retain a snapshot of the data)
`

The removal policy to apply when the cluster and its instances are removed
from the stack or replaced during an update.

### securityGroups?

_Type_ : [`ISecurityGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ISecurityGroup.html)

_Default_ : `- a new security group is created if `vpc` was provided.
  If the `vpc` property was not provided, no VPC security groups will be associated with the DB cluster.
`

Security group.

### storageEncryptionKey?

_Type_ : [`IKey`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IKey.html)

_Default_ : `- the default master key will be used for storage encryption
`

The KMS key for storage encryption.

### subnetGroup?

_Type_ : [`ISubnetGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ISubnetGroup.html)

_Default_ : `- a new subnet group is created if `vpc` was provided.
  If the `vpc` property was not provided, no subnet group will be associated with the DB cluster
`

Existing subnet group for the cluster.

### vpc?

_Type_ : [`IVpc`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IVpc.html)

### vpcSubnets?

_Type_ : [`SubnetSelection`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SubnetSelection.html)

_Default_ : `- the VPC default strategy if not specified.
`

Where to place the instances within the VPC.
If provided, the `vpc` property must also be specified.

## RDSProps



### cdk.cluster?

_Type_ : [`RDSCdkServerlessClusterProps`](#rdscdkserverlessclusterprops)

Configure the internallly created RDS cluster.

#### Examples

```js
new RDS(this, "Database", {
  cdk: {
    cluster: {
      clusterIdentifier: "my-cluster",
    }
  },
});
```


### defaultDatabaseName

_Type_ : `string`

Name of a database which is automatically created inside the cluster.

### engine

_Type_ : `"mysql5.6"`&nbsp; | &nbsp;`"mysql5.7"`&nbsp; | &nbsp;`"postgresql10.14"`

Database engine of the cluster. Cannot be changed once set.

### migrations?

_Type_ : `string`

Path to the directory that contains the migration scripts. The `RDS` construct uses [Kysely](https://koskimas.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.

#### Examples


```js
new RDS(this, "Database", {
  engine: "postgresql10.14",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```


### scaling.autoPause?

_Type_ : `number`&nbsp; | &nbsp;`boolean`

_Default_ : `true
`

The time before the cluster is paused.
Pass in true to pause after 5 minutes of inactive. And pass in false to
disable pausing.

Or pass in the number of minutes to wait before the cluster is paused.

#### Examples

```js
new RDS(this, "Database", {
  scaling: {
    autoPause: props.app.local,
  }
})
```

### scaling.maxCapacity?

_Type_ : `"ACU_1"`&nbsp; | &nbsp;`"ACU_2"`&nbsp; | &nbsp;`"ACU_4"`&nbsp; | &nbsp;`"ACU_8"`&nbsp; | &nbsp;`"ACU_16"`&nbsp; | &nbsp;`"ACU_32"`&nbsp; | &nbsp;`"ACU_64"`&nbsp; | &nbsp;`"ACU_128"`&nbsp; | &nbsp;`"ACU_192"`&nbsp; | &nbsp;`"ACU_256"`&nbsp; | &nbsp;`"ACU_384"`

_Default_ : `"ACU_16"
`

The maximum capacity for the cluster.

### scaling.minCapacity?

_Type_ : `"ACU_1"`&nbsp; | &nbsp;`"ACU_2"`&nbsp; | &nbsp;`"ACU_4"`&nbsp; | &nbsp;`"ACU_8"`&nbsp; | &nbsp;`"ACU_16"`&nbsp; | &nbsp;`"ACU_32"`&nbsp; | &nbsp;`"ACU_64"`&nbsp; | &nbsp;`"ACU_128"`&nbsp; | &nbsp;`"ACU_192"`&nbsp; | &nbsp;`"ACU_256"`&nbsp; | &nbsp;`"ACU_384"`

_Default_ : `"ACU_2"
`

The minimum capacity for the cluster.

