<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new RDS(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[RDSProps](#rdsprops)</span>
## RDSProps


### defaultDatabaseName

_Type_ : <span class="mono">string</span>

Name of a database which is automatically created inside the cluster.

### engine

_Type_ : <span class='mono'><span class="mono">"mysql5.6"</span> | <span class="mono">"mysql5.7"</span> | <span class="mono">"postgresql11.13"</span> | <span class="mono">"postgresql11.16"</span> | <span class="mono">"postgresql13.19"</span></span>

Database engine of the cluster. Cannot be changed once set.

### migrations?

_Type_ : <span class="mono">string</span>

Path to the directory that contains the migration scripts. The `RDS` construct uses [Kysely](https://kysely-org.github.io/kysely/) to run and manage schema migrations. The `migrations` prop should point to the folder where your migration files are.



```js
new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
});
```


### scaling.autoPause?

_Type_ : <span class='mono'><span class="mono">number</span> | <span class="mono">boolean</span></span>

_Default_ : <span class="mono">true</span>

The time before the cluster is paused.
Pass in true to pause after 5 minutes of inactive. And pass in false to
disable pausing.

Or pass in the number of minutes to wait before the cluster is paused.


```js
new RDS(stack, "Database", {
  scaling: {
    autoPause: props.app.stage !== "prod"
  }
})
```

### scaling.maxCapacity?

_Type_ : <span class='mono'><span class="mono">"ACU_1"</span> | <span class="mono">"ACU_2"</span> | <span class="mono">"ACU_4"</span> | <span class="mono">"ACU_8"</span> | <span class="mono">"ACU_16"</span> | <span class="mono">"ACU_32"</span> | <span class="mono">"ACU_64"</span> | <span class="mono">"ACU_128"</span> | <span class="mono">"ACU_192"</span> | <span class="mono">"ACU_256"</span> | <span class="mono">"ACU_384"</span></span>

_Default_ : <span class="mono">"ACU_16"</span>

The maximum capacity for the cluster.

### scaling.minCapacity?

_Type_ : <span class='mono'><span class="mono">"ACU_1"</span> | <span class="mono">"ACU_2"</span> | <span class="mono">"ACU_4"</span> | <span class="mono">"ACU_8"</span> | <span class="mono">"ACU_16"</span> | <span class="mono">"ACU_32"</span> | <span class="mono">"ACU_64"</span> | <span class="mono">"ACU_128"</span> | <span class="mono">"ACU_192"</span> | <span class="mono">"ACU_256"</span> | <span class="mono">"ACU_384"</span></span>

_Default_ : <span class="mono">"ACU_2"</span>

The minimum capacity for the cluster.


### types?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[RDSTypes](#rdstypes)</span></span>

Path to place generated typescript types after running migrations



```js
new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
  types: "backend/core/sql/types.ts",
});
```

```js
new RDS(stack, "Database", {
  engine: "postgresql11.13",
  defaultDatabaseName: "acme",
  migrations: "path/to/migration/scripts",
  types: {
    path: "backend/core/sql/types.ts",
    camelCase: true
  }
});
```


### cdk.cluster?

_Type_ : <span class='mono'><span class="mono">[IServerlessCluster](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.IServerlessCluster.html)</span> | <span class="mono">[RDSCdkServerlessClusterProps](#rdscdkserverlessclusterprops)</span></span>

Configure the internallly created RDS cluster.


```js
new RDS(stack, "Database", {
  cdk: {
    cluster: {
      clusterIdentifier: "my-cluster",
    }
  },
});
```

Alternatively, you can import an existing RDS Serverless v1 Cluster in your AWS account.


```js
new RDS(stack, "Database", {
  cdk: {
    cluster: rds.ServerlessCluster.fromServerlessClusterAttributes(stack, "ICluster", {
      clusterIdentifier: "my-cluster",
    }),
    secret: secretsManager.Secret.fromSecretAttributes(stack, "ISecret", {
      secretPartialArn: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
    }),
  },
});
```

### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

### cdk.secret?

_Type_ : <span class="mono">[ISecret](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_secretsmanager.ISecret.html)</span>

Required when importing existing RDS Serverless v1 Cluster.


## Properties
An instance of `RDS` has the following properties.
### clusterArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created RDS Serverless Cluster.

### clusterEndpoint

_Type_ : <span class="mono">[Endpoint](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.Endpoint.html)</span>

The ARN of the internally created RDS Serverless Cluster.

### clusterIdentifier

_Type_ : <span class="mono">string</span>

The ARN of the internally created RDS Serverless Cluster.

### defaultDatabaseName

_Type_ : <span class="mono">string</span>

The default database name of the RDS Serverless Cluster.

### id

_Type_ : <span class="mono">string</span>

### migratorFunction?

_Type_ : <span class="mono">[Function](Function#function)</span>

The ARN of the internally created CDK ServerlessCluster instance.

### secretArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created Secrets Manager Secret.


### cdk.cluster

_Type_ : <span class="mono">[ServerlessCluster](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.ServerlessCluster.html)</span>

The ARN of the internally created CDK ServerlessCluster instance.


## RDSTypes


### camelCase?

_Type_ : <span class="mono">boolean</span>

### path

_Type_ : <span class="mono">string</span>

## RDSCdkServerlessClusterProps


### vpc?

_Type_ : <span class="mono">[IVpc](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html)</span>
