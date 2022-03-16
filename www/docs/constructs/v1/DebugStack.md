---
description: "Docs for the sst.DebugStack construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new DebugStack(scope: Construct, id: string, props: DebugStackProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`DebugStackProps`](#debugstackprops)
## Examples


// Use a concrete account and region to deploy this stack to:
// `.account` and `.region` will simply return these values.
new Stack(app, 'Stack1', {
  env: {
    account: '123456789012',
    region: 'us-east-1'
  },
});

// Use the CLI's current credentials to determine the target environment:
// `.account` and `.region` will reflect the account+region the CLI
// is configured to use (based on the user CLI credentials)
new Stack(app, 'Stack2', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

// Define multiple stacks stage associated with an environment
const myStage = new Stage(app, 'MyStage', {
  env: {
    account: '123456789012',
    region: 'us-east-1'
  }
});

// both of these stacks will use the stage's account/region:
// `.account` and `.region` will resolve to the concrete values as above
new MyStack(myStage, 'Stack1');
new YourStack(myStage, 'Stack2');

// Define an environment-agnostic stack:
// `.account` and `.region` will resolve to `{ "Ref": "AWS::AccountId" }` and `{ "Ref": "AWS::Region" }` respectively.
// which will only resolve to actual values by CloudFormation during deployment.
new MyStack(app, 'Stack1');

## Properties
An instance of `DebugStack` has the following properties.
### stage

_Type_ : `string`

## DebugStackProps
### analyticsReporting

_Type_ : `boolean`

Include runtime versioning information in this Stack.

`analyticsReporting` setting of containing `App`, or value of
'aws:cdk:version-reporting' context key
stable

### description

_Type_ : `string`

A description of the stack.

- No description.
stable

### env

_Type_ : [`Environment`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Environment.html)

The AWS environment (account/region) where this stack will be deployed.
Set the `region`/`account` fields of `env` to either a concrete value to
select the indicated environment (recommended for production stacks), or to
the values of environment variables
`CDK_DEFAULT_REGION`/`CDK_DEFAULT_ACCOUNT` to let the target environment
depend on the AWS credentials/configuration that the CDK CLI is executed
under (recommended for development stacks).

If the `Stack` is instantiated inside a `Stage`, any undefined
`region`/`account` fields from `env` will default to the same field on the
encompassing `Stage`, if configured there.

If either `region` or `account` are not set nor inherited from `Stage`, the
Stack will be considered "*environment-agnostic*"". Environment-agnostic
stacks can be deployed to any environment but may not be able to take
advantage of all features of the CDK. For example, they will not be able to
use environmental context lookups such as `ec2.Vpc.fromLookup` and will not
automatically translate Service Principals to the right format based on the
environment's AWS partition, and other such enhancements.

- The environment of the containing `Stage` if available,
otherwise create the stack will be environment-agnostic.
stable
### payloadBucketArn

_Type_ : `string`

S3 bucket to store large websocket payloads.

### stackName

_Type_ : `string`

Name to deploy the stack with.

- Derived from construct path.
stable

### synthesizer

_Type_ : [`IStackSynthesizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IStackSynthesizer.html)

Synthesis method to use while deploying this stack.

- `DefaultStackSynthesizer` if the `@aws-cdk/core:newStyleStackSynthesis` feature flag
is set, `LegacyStackSynthesizer` otherwise.
stable




Stack tags that will be applied to all the taggable resources and the stack itself.

{}
stable

### terminationProtection

_Type_ : `boolean`

Whether to enable termination protection for this stack.

false
stable

### websocketHandlerRoleArn

_Type_ : `string`

Lambda function props for WebSocket request handlers.
