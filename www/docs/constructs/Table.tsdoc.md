<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Table(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[TableProps](#tableprops)</span>
## TableProps


### consumers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[TableConsumerProps](#tableconsumerprops)</span></span>&gt;</span>

Configure DynamoDB streams and consumers



```js
const table = new Table(stack, "Table", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});
```


### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the consumers in the Table. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.



```js
new Table(stack, "Table", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    }
  },
});
```


### fields?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">"string"</span> | <span class="mono">"number"</span> | <span class="mono">"binary"</span></span>&gt;</span>

An object defining the fields of the table. Key is the name of the field and the value is the type.


```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
  }
})
```

### globalIndexes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableGlobalIndexProps](#tableglobalindexprops)</span>&gt;</span>

Configure the table's global secondary indexes



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
    gsi1pk: "string",
    gsi1sk: "string",
  },
  globalIndexes: {
    "GSI1": { partitionKey: "gsi1pk", sortKey: "gsi1sk" },
  },
});
```

### kinesisStream?

_Type_ : <span class="mono">[KinesisStream](KinesisStream#kinesisstream)</span>

Configure the KinesisStream to capture item-level changes for the table.



```js
const stream = new Table(stack, "Stream");

new Table(stack, "Table", {
  kinesisStream: stream,
});
```

### localIndexes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableLocalIndexProps](#tablelocalindexprops)</span>&gt;</span>

Configure the table's local secondary indexes



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
    lsi1sk: "string",
  },
  localIndexes: {
    "lsi1": { sortKey: "lsi1sk" },
  },
});
```


### primaryIndex.partitionKey

_Type_ : <span class="mono">string</span>

Define the Partition Key for the table's primary index



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
  },
  primaryIndex: { partitionKey: "pk" },
});
```

### primaryIndex.sortKey?

_Type_ : <span class="mono">string</span>

Define the Sort Key for the table's primary index



```js
new Table(stack, "Table", {
  fields: {
    pk: "string",
    sk: "string",
  },
  primaryIndex: { partitionKey: "pk", sortKey: "sk" },
});
```


### stream?

_Type_ : <span class='mono'><span class="mono">boolean</span> | <span class="mono">"keys_only"</span> | <span class="mono">"new_image"</span> | <span class="mono">"old_image"</span> | <span class="mono">"new_and_old_images"</span></span>

Configure the information that will be written to the Stream.


```js {8}
new Table(stack, "Table", {
  stream: "new_image",
});
```

### timeToLiveAttribute?

_Type_ : <span class="mono">string</span>

The field that's used to store the expiration time for items in the table.


```js {8}
new Table(stack, "Table", {
  timeToLiveAttribute: "expireAt",
});
```


### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

### cdk.table?

_Type_ : <span class='mono'><span class="mono">[ITable](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.ITable.html)</span> | <span class="mono">Omit&lt;<span class="mono">[TableProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html)</span>, <span class='mono'><span class="mono">"sortKey"</span> | <span class="mono">"partitionKey"</span></span>&gt;</span></span>

Override the settings of the internally created cdk table


## Properties
An instance of `Table` has the following properties.
### id

_Type_ : <span class="mono">string</span>

### tableArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created DynamoDB Table.

### tableName

_Type_ : <span class="mono">string</span>

The name of the internally created DynamoDB Table.


### cdk.table

_Type_ : <span class="mono">[ITable](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.ITable.html)</span>

The internally created CDK `Table` instance.


## Methods
An instance of `Table` has the following methods.
### addConsumers

```ts
addConsumers(scope, consumers)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __consumers__ 



Define additional consumers for table events


```js
table.addConsumers(stack, {
  consumer1: "src/consumer1.main",
  consumer2: "src/consumer2.main",
});
```

### addGlobalIndexes

```ts
addGlobalIndexes(secondaryIndexes)
```
_Parameters_
- __secondaryIndexes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableGlobalIndexProps](#tableglobalindexprops)</span>&gt;</span>


Add additional global secondary indexes where the `key` is the name of the global secondary index


```js
table.addGlobalIndexes({
  gsi1: {
    partitionKey: "pk",
    sortKey: "sk",
  }
})
```

### addLocalIndexes

```ts
addLocalIndexes(secondaryIndexes)
```
_Parameters_
- __secondaryIndexes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[TableLocalIndexProps](#tablelocalindexprops)</span>&gt;</span>


Add additional local secondary indexes where the `key` is the name of the local secondary index


```js
table.addLocalIndexes({
  lsi1: {
    sortKey: "sk",
  }
})
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Grant permissions to all consumers of this table.


```js
table.attachPermissions(["s3"]);
```

### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName, permissions)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Grant permissions to a specific consumer of this table.


```js
table.attachPermissionsToConsumer("consumer1", ["s3"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to all consumers of this table.


```js
table.bind([STRIPE_KEY, bucket]);
```

### bindToConsumer

```ts
bindToConsumer(consumerName, constructs)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to a specific consumer of this table.


```js
table.bindToConsumer("consumer1", [STRIPE_KEY, bucket]);
```

### getFunction

```ts
getFunction(consumerName)
```
_Parameters_
- __consumerName__ <span class="mono">string</span>


Get the instance of the internally created Function, for a given consumer.
```js
 const table = new Table(stack, "Table", {
   consumers: {
     consumer1: "./src/function.handler",
   }
 })
table.getFunction("consumer1");
```

## TableConsumerProps


### filters?

_Type_ : <span class='mono'>Array&lt;<span class="mono">any</span>&gt;</span>

Used to filter the records that are passed to the consumer function.


```js
const table = new Table(stack, "Table", {
  consumers: {
    myConsumer: {
      function: "src/consumer1.main",
      filters: [
        {
          dynamodb: {
            Keys: {
              Id: {
                N: ["101"]
              }
            }
          }
        }
      ]
    }
  },
});
```

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Used to create the consumer function for the table.


### cdk.eventSource?

_Type_ : <span class="mono">[DynamoEventSourceProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.DynamoEventSourceProps.html)</span>

Override the settings of the internally created event source


## TableLocalIndexProps


### projection?

_Type_ : <span class='mono'><span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span> | <span class="mono">"all"</span> | <span class="mono">"keys_only"</span></span>

_Default_ : <span class="mono">"all"</span>

The set of attributes that are projected into the secondary index.

### sortKey

_Type_ : <span class="mono">string</span>

The field that's to be used as the sort key for the index.


### cdk.index?

_Type_ : <span class="mono">Omit&lt;<span class="mono">[LocalSecondaryIndexProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.LocalSecondaryIndexProps.html)</span>, <span class='mono'><span class="mono">"indexName"</span> | <span class="mono">"sortKey"</span></span>&gt;</span>

Override the settings of the internally created local secondary indexes


## TableGlobalIndexProps


### partitionKey

_Type_ : <span class="mono">string</span>

The field that's to be used as a partition key for the index.

### projection?

_Type_ : <span class='mono'><span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span> | <span class="mono">"all"</span> | <span class="mono">"keys_only"</span></span>

_Default_ : <span class="mono">"all"</span>

The set of attributes that are projected into the secondary index.

### sortKey?

_Type_ : <span class="mono">string</span>

The field that's to be used as the sort key for the index.


### cdk.index?

_Type_ : <span class="mono">Omit&lt;<span class="mono">[GlobalSecondaryIndexProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.GlobalSecondaryIndexProps.html)</span>, <span class='mono'><span class="mono">"indexName"</span> | <span class="mono">"sortKey"</span> | <span class="mono">"partitionKey"</span></span>&gt;</span>

Override the settings of the internally created global secondary index

