---
description: "Docs for the sst.DebugStack construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new DebugStack(scope: Construct, id: string, props: DebugStackProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`DebugStackProps`](#debugstackprops)
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
- The environment of the containing `Stage` if available,
otherwise create the stack will be environment-agnostic.
stable


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

### tags

_Type_ : unknown

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