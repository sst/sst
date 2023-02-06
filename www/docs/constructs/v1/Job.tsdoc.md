<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Job(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[JobProps](#jobprops)</span>
## JobProps


### bind?

_Type_ : <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>

Bind resources for the job


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  bind: [STRIPE_KEY, bucket],
})
```

### config?

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">[Secret](Secret#secret)</span> | <span class="mono">[Parameter](Parameter#parameter)</span></span>&gt;</span>

Configure environment variables for the job


```js
// Change
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  config: [STRIPE_KEY, API_URL]
})

// To
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  bind: [STRIPE_KEY, API_URL]
})
```

The "config" prop is deprecated, and will be removed in SST v2. Pass Parameters and Secrets in through the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/constructs/function

### enableLiveDev?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">true</span>

Can be used to disable Live Lambda Development when using `sst start`. Useful for things like Custom Resources that need to execute during deployment.


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  enableLiveDev: false
})
```

### environment?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>

Configure environment variables for the job


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  environment: {
    DEBUG: "*",
  }
})
```

### handler

_Type_ : <span class="mono">string</span>

Path to the entry point and handler function. Of the format:
`/path/to/file.function`.


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
})
```

### memorySize?

_Type_ : <span class='mono'><span class="mono">"3 GB"</span> | <span class="mono">"7 GB"</span> | <span class="mono">"15 GB"</span> | <span class="mono">"145 GB"</span></span>

_Default_ : <span class="mono">"3 GB"</span>

The amount of memory in MB allocated.


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  memorySize: "3 GB",
})
```

### permissions?

_Type_ : <span class="mono">[Permissions](Permissions)</span>

Attaches the given list of permissions to the job. Configuring this property is equivalent to calling `attachPermissions()` after the job is created.


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  permissions: ["ses"]
})
```

### srcPath?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">Defaults to the same directory as sst.json</span>

Root directory of the project, typically where package.json is located. Set if using a monorepo with multiple subpackages


```js
new Job(stack, "MyJob", {
  srcPath: "services",
  handler: "job.handler",
})
```

### timeout?

_Type_ : <span class='mono'><span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

_Default_ : <span class="mono">"8 hours"</span>

The execution timeout. Minimum 5 minutes. Maximum 8 hours.


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  timeout: "30 minutes",
})
```

### cdk?

_Type_ : <span class="mono">[JobCDKProps](#jobcdkprops)</span>

## Properties
An instance of `Job` has the following properties.
### id

_Type_ : <span class="mono">string</span>

## Methods
An instance of `Job` has the following methods.
### addConfig

:::caution
This function signature has been deprecated.
```ts
addConfig(config)
```


Attaches additional configs to job.


```js
const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");

// Change
job.addConfig([STRIPE_KEY]);

// To
job.bind([STRIPE_KEY]);
```

The "config" prop is deprecated, and will be removed in SST v2. Pass Parameters and Secrets in through the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/constructs/function

:::
### addEnvironment

```ts
addEnvironment(name, value)
```
_Parameters_
- __name__ <span class="mono">string</span>
- __value__ <span class="mono">string</span>


Attaches additional environment variable to the job.


```js
fn.addEnvironment({
  DEBUG: "*"
});
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of [permissions](Permissions.md) to the job. This allows the job to access other AWS resources.


```js
job.attachPermissions(["ses"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds additional resources to job.


```js
job.bind([STRIPE_KEY, bucket]);
```

## JobCDKProps


### id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

### vpc?

_Type_ : <span class="mono">[IVpc](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html)</span>

Runs codebuild job in the specified VPC. Note this will only work once deployed.


```js
new Job(stack, "MyJob", {
  handler: "src/job.handler",
  cdk: {
    vpc: Vpc.fromLookup(this, "VPC", {
      vpcId: "vpc-xxxxxxxxxx",
    }),
  }
})
```
