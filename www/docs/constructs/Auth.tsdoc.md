<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Auth(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[AuthProps](#authprops)</span>
## AuthProps


### api

_Type_ : <span class="mono">[Api](Api#api)</span>

The API to attach auth routes to

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span>

The function that will handle authentication

### prefix?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">"/auth"</span>

Optionally specify the prefix to mount authentication routes

## Properties
An instance of `Auth` has the following properties.