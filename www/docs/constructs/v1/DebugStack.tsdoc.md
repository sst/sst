<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new DebugStack(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[DebugStackProps](#debugstackprops)</span>
## DebugStackProps
Stack properties for the DebugStack.

### payloadBucketArn?

_Type_ : <span class="mono">string</span>

S3 bucket to store large websocket payloads.

### websocketHandlerRoleArn?

_Type_ : <span class="mono">string</span>

Lambda function props for WebSocket request handlers.


### cdk.table?

_Type_ : <span class="mono">Omit&lt;<span class="mono">[TableProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html)</span>, <span class='mono'><span class="mono">"sortKey"</span> | <span class="mono">"partitionKey"</span></span>&gt;</span>

Override the settings of the internally created DynamoDB table


## Properties
An instance of `DebugStack` has the following properties.
### stage

_Type_ : <span class="mono">string</span>
