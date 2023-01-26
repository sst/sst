<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new AppSyncApi(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[AppSyncApiProps](#appsyncapiprops)</span>
## AppSyncApiProps


### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[AppSyncApiDomainProps](#appsyncapidomainprops)</span></span>

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)


```js
new AppSyncApi(stack, "GraphqlApi", {
  customDomain: "api.example.com"
})
```


```js
new AppSyncApi(stack, "GraphqlApi", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
  }
})
```

### dataSources?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[AppSyncApiLambdaDataSourceProps](#appsyncapilambdadatasourceprops)</span> | <span class="mono">[AppSyncApiDynamoDbDataSourceProps](#appsyncapidynamodbdatasourceprops)</span> | <span class="mono">[AppSyncApiRdsDataSourceProps](#appsyncapirdsdatasourceprops)</span> | <span class="mono">[AppSyncApiHttpDataSourceProps](#appsyncapihttpdatasourceprops)</span> | <span class="mono">[AppSyncApiNoneDataSourceProps](#appsyncapinonedatasourceprops)</span></span>&gt;</span>

Define datasources. Can be a function, dynamodb table, rds cluster or http endpoint


```js
new AppSyncApi(stack, "GraphqlApi", {
  dataSources: {
    notes: "src/notes.main",
  },
  resolvers: {
    "Query    listNotes": "notes",
  },
});
```


### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the AppSyncApi. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new AppSyncApi(stack, "AppSync", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  },
});
```


### resolvers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[AppSyncApiResolverProps](#appsyncapiresolverprops)</span></span>&gt;</span>

The resolvers for this API. Takes an object, with the key being the type name and field name as a string and the value is either a string with the name of existing data source.


```js
new AppSyncApi(stack, "GraphqlApi", {
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Query    getNoteById": "src/get.main",
    "Mutation createNote": "src/create.main",
    "Mutation updateNote": "src/update.main",
    "Mutation deleteNote": "src/delete.main",
  },
});
```

### schema?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span></span>

The GraphQL schema definition.



```js
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
});
```


### cdk.graphqlApi?

_Type_ : <span class='mono'><span class="mono">[IGraphqlApi](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync.IGraphqlApi.html)</span> | <span class="mono">[AppSyncApiCdkGraphqlProps](#appsyncapicdkgraphqlprops)</span></span>

Allows you to override default settings this construct uses internally to create the AppSync API.

### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.


## Properties
An instance of `AppSyncApi` has the following properties.
### apiArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created AppSync GraphQL API.

### apiId

_Type_ : <span class="mono">string</span>

The Id of the internally created AppSync GraphQL API.

### apiName

_Type_ : <span class="mono">string</span>

The name of the internally created AppSync GraphQL API.

### customDomainUrl

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

If custom domain is enabled, this is the custom domain URL of the Api.

### id

_Type_ : <span class="mono">string</span>

### url

_Type_ : <span class="mono">string</span>

The AWS generated URL of the Api.


### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

If custom domain is enabled, this is the internally created CDK Certificate instance.

### cdk.graphqlApi

_Type_ : <span class="mono">[GraphqlApi](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync.GraphqlApi.html)</span>

The internally created appsync api


## Methods
An instance of `AppSyncApi` has the following methods.
### addDataSources

```ts
addDataSources(scope, dataSources)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __dataSources__ 



Add data sources after the construct has been created


```js
api.addDataSources(stack, {
  billingDS: "src/billing.main",
});
```

### addResolvers

```ts
addResolvers(scope, resolvers)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __resolvers__ 



Add resolvers the construct has been created


```js
api.addResolvers(stack, {
  "Mutation charge": "billingDS",
});
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to all function data sources


```js
api.attachPermissions(["s3"]);
```

### attachPermissionsToDataSource

```ts
attachPermissionsToDataSource(key, permissions)
```
_Parameters_
- __key__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to a specific function datasource. This allows that function to access other AWS resources.


```js
api.attachPermissionsToDataSource("Mutation charge", ["s3"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to all function data sources.



```js
api.bind([STRIPE_KEY, bucket]);
```

### bindToDataSource

```ts
bindToDataSource(key, constructs)
```
_Parameters_
- __key__ <span class="mono">string</span>
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to a specific function data source.


```js
api.bindToDataSource("Mutation charge", [STRIPE_KEY, bucket]);
```


### getDataSource

```ts
getDataSource(key)
```
_Parameters_
- __key__ <span class="mono">string</span>


Get a datasource by name


```js
api.getDataSource("billingDS");
```

### getFunction

```ts
getFunction(key)
```
_Parameters_
- __key__ <span class="mono">string</span>


Get the instance of the internally created Function, for a given resolver.


```js
const func = api.getFunction("Mutation charge");
```

### getResolver

```ts
getResolver(key)
```
_Parameters_
- __key__ <span class="mono">string</span>


Get a resolver


```js
api.getResolver("Mutation charge");
```

## MappingTemplateFile


### file

_Type_ : <span class="mono">string</span>

Path to the file containing the VTL mapping template

## AppSyncApiDomainProps


### domainName?

_Type_ : <span class="mono">string</span>

The domain to be assigned to the API endpoint (ie. api.domain.com)

### hostedZone?

_Type_ : <span class="mono">string</span>

The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone by stripping out the first part of the domainName that's passed in. So, if your domainName is api.domain.com. SST will default the hostedZone to domain.com.

### isExternalDomain?

_Type_ : <span class="mono">boolean</span>

Set this option if the domain is not hosted on Amazon Route 53.


### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

Override the internally created certificate

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

Override the internally created hosted zone


## MappingTemplateInline


### inline

_Type_ : <span class="mono">string</span>

Inline definition of the VTL mapping template

## AppSyncApiResolverProps
Used to define full resolver config

### dataSource?

_Type_ : <span class="mono">string</span>

The data source for this resolver. The data source must be already created.

### function?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function definition used to create the data source for this resolver.

### requestMapping?

_Type_ : <span class='mono'><span class="mono">[MappingTemplateFile](#mappingtemplatefile)</span> | <span class="mono">[MappingTemplateInline](#mappingtemplateinline)</span></span>

VTL request mapping template


```js
  requestMapping: {
    inline: '{"version" : "2017-02-28", "operation" : "Scan"}',
  },
```


```js
  requestMapping: {
    file: "path/to/template.vtl",
  },
```

### responseMapping?

_Type_ : <span class='mono'><span class="mono">[MappingTemplateFile](#mappingtemplatefile)</span> | <span class="mono">[MappingTemplateInline](#mappingtemplateinline)</span></span>

VTL response mapping template


```js
  responseMapping: {
    inline: "$util.toJson($ctx.result.items)",
  },
```


```js
  responseMapping: {
    file: "path/to/template.vtl",
  },
```


### cdk.resolver

_Type_ : <span class="mono">Omit&lt;<span class="mono">[ResolverProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync.ResolverProps.html)</span>, <span class='mono'><span class="mono">"api"</span> | <span class="mono">"fieldName"</span> | <span class="mono">"typeName"</span> | <span class="mono">"dataSource"</span></span>&gt;</span>

This allows you to override the default settings this construct uses internally to create the resolver.


## AppSyncApiCdkGraphqlProps


### name?

_Type_ : <span class="mono">string</span>

## AppSyncApiRdsDataSourceProps
Used to define a RDS data source


```js
new AppSyncApi(stack, "AppSync", {
  dataSources: {
    rds: {
      type: "rds",
      rds: MyRDSCluster
    },
  },
});
```

### databaseName?

_Type_ : <span class="mono">string</span>

The name of the database to connect to

### description?

_Type_ : <span class="mono">string</span>

Description of the data source

### name?

_Type_ : <span class="mono">string</span>

Name of the data source

### rds?

_Type_ : <span class="mono">[RDS](RDS#rds)</span>

Target RDS construct

### type

_Type_ : <span class="mono">"rds"</span>

String literal to signify that this data source is an RDS database



### cdk.dataSource.databaseName?

_Type_ : <span class="mono">string</span>

### cdk.dataSource.secretStore

_Type_ : <span class="mono">[ISecret](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_secretsmanager.ISecret.html)</span>

### cdk.dataSource.serverlessCluster

_Type_ : <span class="mono">[IServerlessCluster](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.IServerlessCluster.html)</span>



## AppSyncApiHttpDataSourceProps
Used to define an http data source


```js
new AppSyncApi(stack, "AppSync", {
  dataSources: {
    http: {
      type: "http",
      endpoint: "https://example.com"
    },
  },
});
```

### description?

_Type_ : <span class="mono">string</span>

Description of the data source

### endpoint

_Type_ : <span class="mono">string</span>

URL to forward requests to

### name?

_Type_ : <span class="mono">string</span>

Name of the data source

### type

_Type_ : <span class="mono">"http"</span>

String literal to signify that this data source is an HTTP endpoint



### cdk.dataSource.authorizationConfig?

_Type_ : <span class="mono">[AwsIamConfig](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync.AwsIamConfig.html)</span>



## AppSyncApiNoneDataSourceProps
Used to define a none data source


```js
new AppSyncApi(stack, "AppSync", {
  dataSources: {
    none: {
      type: "none",
    },
  },
});
```

### description?

_Type_ : <span class="mono">string</span>

Description of the data source

### name?

_Type_ : <span class="mono">string</span>

Name of the data source

### type

_Type_ : <span class="mono">"none"</span>

String literal to signify that this data source is an HTTP endpoint

## AppSyncApiLambdaDataSourceProps
Used to define a lambda data source


```js
new AppSyncApi(stack, "AppSync", {
  dataSources: {
    lambda: {
      type: "function",
      function: "src/function.handler"
    },
  },
});
```


### description?

_Type_ : <span class="mono">string</span>

Description of the data source

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Function definition

### name?

_Type_ : <span class="mono">string</span>

Name of the data source

### type?

_Type_ : <span class="mono">"function"</span>

String literal to signify that this data source is a function

## AppSyncApiDynamoDbDataSourceProps
Used to define a DynamoDB data source


```js
new AppSyncApi(stack, "AppSync", {
  dataSources: {
    table: {
      type: "table",
      table: MyTable
    },
  },
});
```

### description?

_Type_ : <span class="mono">string</span>

Description of the data source

### name?

_Type_ : <span class="mono">string</span>

Name of the data source

### table?

_Type_ : <span class="mono">[Table](Table#table)</span>

Target table

### type

_Type_ : <span class="mono">"dynamodb"</span>

String literal to signify that this data source is a dynamodb table



### cdk.dataSource.table

_Type_ : <span class="mono">[Table](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html)</span>


