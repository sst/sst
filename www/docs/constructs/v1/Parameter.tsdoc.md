<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Config.Parameter(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[ParameterProps](#parameterprops)</span>
## ParameterProps


### value

_Type_ : <span class="mono">string</span>

Value of the parameter

## Properties
An instance of `Parameter` has the following properties.
### id

_Type_ : <span class="mono">string</span>

### name

_Type_ : <span class="mono">string</span>

### value

_Type_ : <span class="mono">string</span>

## Methods
An instance of `Parameter` has the following methods.
### create

```ts
static create(scope, parameters)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __parameters__ <span class="mono">T</span>