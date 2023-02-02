<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Script(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[ScriptProps](#scriptprops)</span>
## ScriptProps



### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new Script(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
    }
  }
});
```


### onCreate?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Creates the function that runs when the Script is created.


```js
new Script(stack, "Api", {
  onCreate: "src/function.handler",
})
```

### onDelete?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Create the function that runs when the Script is deleted from the stack.


```js
new Script(stack, "Api", {
  onDelete: "src/function.handler",
})
```

### onUpdate?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Creates the function that runs on every deploy after the Script is created


```js
new Script(stack, "Api", {
  onUpdate: "src/function.handler",
})
```

### params?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">any</span>&gt;</span>

An object of input parameters to be passed to the script. Made available in the `event` object of the function.


```js
import { Script } from "@serverless-stack/resources";

new Script(stack, "Script", {
  onCreate: "src/script.create",
  params: {
    hello: "world",
  },
});
```

## Properties
An instance of `Script` has the following properties.
### createFunction?

_Type_ : <span class="mono">[Function](Function#function)</span>

The internally created onCreate `Function` instance.

### deleteFunction?

_Type_ : <span class="mono">[Function](Function#function)</span>

The internally created onDelete `Function` instance.

### updateFunction?

_Type_ : <span class="mono">[Function](Function#function)</span>

The internally created onUpdate `Function` instance.

## Methods
An instance of `Script` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Grants additional permissions to the script


```js
script.attachPermissions(["s3"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds additional resources to the script


```js
script.bind([STRIPE_KEY, bucket]);
```
