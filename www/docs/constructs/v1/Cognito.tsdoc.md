<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Cognito(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[CognitoProps](#cognitoprops)</span>
## CognitoProps



### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the triggers in the UserPool. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.



```js
new Cognito(stack, "Auth", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    }
  },
});
```


### identityPoolFederation?

_Type_ : <span class='mono'><span class="mono">boolean</span> | <span class="mono">[CognitoIdentityPoolFederationProps](#cognitoidentitypoolfederationprops)</span></span>

_Default_ : <span class="mono">Identity Pool created with the User Pool as the authentication provider</span>

Configure the Cognito Identity Pool and its authentication providers.

### login?

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"email"</span> | <span class="mono">"phone"</span> | <span class="mono">"username"</span> | <span class="mono">"preferredUsername"</span></span>&gt;</span>

_Default_ : <span class="mono">`["username"]`</span>

Configure the different ways a user can sign in to our application for our User Pool. For example, you might want a user to be able to sign in with their email or username. Or with their phone number.
:::caution
You cannot change the login property once the User Pool has been created.
:::

### triggers?

_Type_ : <span class="mono">[CognitoUserPoolTriggers](#cognitouserpooltriggers)</span>

_Default_ : <span class="mono">No triggers</span>

Configure triggers for this User Pool



```js
new Cognito(stack, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});
```


### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

### cdk.userPool?

_Type_ : <span class='mono'><span class="mono">[UserPoolProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolProps.html)</span> | <span class="mono">[IUserPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPool.html)</span></span>

This allows you to override the default settings this construct uses internally to create the User Pool.

### cdk.userPoolClient?

_Type_ : <span class='mono'><span class="mono">[UserPoolClientOptions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolClientOptions.html)</span> | <span class="mono">[IUserPoolClient](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPoolClient.html)</span></span>

This allows you to override the default settings this construct uses internally to create the User Pool client.


## Properties
An instance of `Cognito` has the following properties.
### cognitoIdentityPoolId

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

The id of the internally created `IdentityPool` instance.

### id

_Type_ : <span class="mono">string</span>

### userPoolArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created Cognito User Pool.

### userPoolClientId

_Type_ : <span class="mono">string</span>

The id of the internally created Cognito User Pool client.

### userPoolId

_Type_ : <span class="mono">string</span>

The id of the internally created Cognito User Pool.


### cdk.authRole

_Type_ : <span class="mono">[Role](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)</span>

### cdk.cfnIdentityPool?

_Type_ : <span class="mono">[CfnIdentityPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnIdentityPool.html)</span>

### cdk.unauthRole

_Type_ : <span class="mono">[Role](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)</span>

### cdk.userPool

_Type_ : <span class="mono">[IUserPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPool.html)</span>

### cdk.userPoolClient

_Type_ : <span class="mono">[IUserPoolClient](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPoolClient.html)</span>


## Methods
An instance of `Cognito` has the following methods.
### attachPermissionsForAuthUsers

```ts
attachPermissionsForAuthUsers(scope, permissions)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to the authenticated users. This allows the authenticated users to access other AWS resources.


```js
auth.attachPermissionsForAuthUsers(stack, ["s3"]);
```

:::caution
This function signature has been deprecated.
```ts
attachPermissionsForAuthUsers(permissions)
```




You are now required to pass in a scope as the first argument.

```js
// Change
auth.attachPermissionsForAuthUsers(["s3"]);
// to
auth.attachPermissionsForAuthUsers(auth, ["s3"]);
```

:::
### attachPermissionsForTrigger

```ts
attachPermissionsForTrigger(triggerKey, permissions)
```
_Parameters_
- __triggerKey__ 
- __permissions__ <span class="mono">[Permissions](Permissions)</span>
### attachPermissionsForTriggers

```ts
attachPermissionsForTriggers(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>
### attachPermissionsForUnauthUsers

```ts
attachPermissionsForUnauthUsers(scope, permissions)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to the authenticated users. This allows the authenticated users to access other AWS resources.


```js
auth.attachPermissionsForUnauthUsers(stack, ["s3"]);
```

:::caution
This function signature has been deprecated.
```ts
attachPermissionsForUnauthUsers(permissions)
```




You are now required to pass in a scope as the first argument.
```js
// Change
auth.attachPermissionsForUnauthUsers(["s3"]);
// to
auth.attachPermissionsForUnauthUsers(auth, ["s3"]);
```

:::
### bindForTrigger

```ts
bindForTrigger(triggerKey, constructs)
```
_Parameters_
- __triggerKey__ 
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>
### bindForTriggers

```ts
bindForTriggers(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>
### getFunction

```ts
getFunction(triggerKey)
```
_Parameters_
- __triggerKey__ 
## CognitoAppleProps


### servicesId

_Type_ : <span class="mono">string</span>

## CognitoAuth0Props


### clientId

_Type_ : <span class="mono">string</span>

### domain

_Type_ : <span class="mono">string</span>

## CognitoAmazonProps


### appId

_Type_ : <span class="mono">string</span>

## CognitoGoogleProps


### clientId

_Type_ : <span class="mono">string</span>

## CognitoTwitterProps


### consumerKey

_Type_ : <span class="mono">string</span>

### consumerSecret

_Type_ : <span class="mono">string</span>

## CognitoFacebookProps


### appId

_Type_ : <span class="mono">string</span>

## CognitoUserPoolTriggers


### createAuthChallenge?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### customEmailSender?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### customMessage?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### customSmsSender?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### defineAuthChallenge?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### postAuthentication?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### postConfirmation?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### preAuthentication?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### preSignUp?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### preTokenGeneration?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### userMigration?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### verifyAuthChallengeResponse?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

## CognitoCdkCfnIdentityPoolProps


### allowUnauthenticatedIdentities?

_Type_ : <span class="mono">boolean</span>

## CognitoIdentityPoolFederationProps


### amazon?

_Type_ : <span class="mono">[CognitoAmazonProps](#cognitoamazonprops)</span>

### apple?

_Type_ : <span class="mono">[CognitoAppleProps](#cognitoappleprops)</span>

### auth0?

_Type_ : <span class="mono">[CognitoAuth0Props](#cognitoauth0props)</span>

### facebook?

_Type_ : <span class="mono">[CognitoFacebookProps](#cognitofacebookprops)</span>

### google?

_Type_ : <span class="mono">[CognitoGoogleProps](#cognitogoogleprops)</span>

### twitter?

_Type_ : <span class="mono">[CognitoTwitterProps](#cognitotwitterprops)</span>


### cdk.cfnIdentityPool?

_Type_ : <span class="mono">[CognitoCdkCfnIdentityPoolProps](#cognitocdkcfnidentitypoolprops)</span>

