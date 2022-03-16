---
description: "Docs for the sst.Bucket construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Bucket(scope: Construct, id: string, props: BucketProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`BucketProps`](#bucketprops)
## Properties
An instance of `Bucket` has the following properties.
### bucketArn

_Type_ : `string`

### bucketName

_Type_ : `string`


### cdk.bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)


### notificationFunctions

_Type_ : [`Function`](Function)

## Methods
An instance of `Bucket` has the following methods.
### addNotifications

```ts
addNotifications(scope: Construct, notifications: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __notifications__ [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`BucketQueueNotificationProps`](#bucketqueuenotificationprops)&nbsp; | &nbsp;[`Topic`](Topic)&nbsp; | &nbsp;[`BucketTopicNotificationProps`](#buckettopicnotificationprops)
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToNotification

```ts
attachPermissionsToNotification(index: number, permissions: Permissions)
```
_Parameters_
- __index__ `number`
- __permissions__ [`Permissions`](Permissions)
## BucketBaseNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

### filters

_Type_ : 
### filters.prefix

_Type_ : `string`

### filters.suffix

_Type_ : `string`


## BucketFunctionNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

### filters

_Type_ : 
### filters.prefix

_Type_ : `string`

### filters.suffix

_Type_ : `string`


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## BucketProps

### cdk.bucket

_Type_ : [`Bucket`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Bucket.html)&nbsp; | &nbsp;[`BucketProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BucketProps.html)



### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)


### notifications

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`BucketFunctionNotificationProps`](#bucketfunctionnotificationprops)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`BucketQueueNotificationProps`](#bucketqueuenotificationprops)&nbsp; | &nbsp;[`Topic`](Topic)&nbsp; | &nbsp;[`BucketTopicNotificationProps`](#buckettopicnotificationprops)

## BucketQueueNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

### filters

_Type_ : 
### filters.prefix

_Type_ : `string`

### filters.suffix

_Type_ : `string`


### queue

_Type_ : [`Queue`](Queue)

## BucketTopicNotificationProps
### events

_Type_ : `"object_created"`&nbsp; | &nbsp;`"object_created_put"`&nbsp; | &nbsp;`"object_created_post"`&nbsp; | &nbsp;`"object_created_copy"`&nbsp; | &nbsp;`"object_created_complete_multipart_upload"`&nbsp; | &nbsp;`"object_removed"`&nbsp; | &nbsp;`"object_removed_delete"`&nbsp; | &nbsp;`"object_removed_delete_marker_created"`&nbsp; | &nbsp;`"object_restore_post"`&nbsp; | &nbsp;`"object_restore_completed"`&nbsp; | &nbsp;`"reduced_redundancy_lost_object"`&nbsp; | &nbsp;`"replication_operation_failed_replication"`&nbsp; | &nbsp;`"replication_operation_missed_threshold"`&nbsp; | &nbsp;`"replication_operation_replicated_after_threshold"`&nbsp; | &nbsp;`"replication_operation_not_tracked"`&nbsp; | &nbsp;`"lifecycle_expiration"`&nbsp; | &nbsp;`"lifecycle_expiration_delete"`&nbsp; | &nbsp;`"lifecycle_expiration_delete_marker_created"`&nbsp; | &nbsp;`"lifecycle_transition"`&nbsp; | &nbsp;`"intelligent_tiering"`&nbsp; | &nbsp;`"object_tagging"`&nbsp; | &nbsp;`"object_tagging_put"`&nbsp; | &nbsp;`"object_tagging_delete"`&nbsp; | &nbsp;`"object_acl_put"`

### filters

_Type_ : 
### filters.prefix

_Type_ : `string`

### filters.suffix

_Type_ : `string`


### topic

_Type_ : [`Topic`](Topic)
