---
description: "Docs for the sst.Auth construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Auth` construct is a higher level CDK construct that makes it easy to configure a [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) and [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). Also, allows setting up Auth0, Facebook, Google, Twitter, Apple, and Amazon as authentication providers.

## Constructor
```ts
new Auth(scope: Construct, id: string, props: AuthProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`AuthProps`](#authprops)
## Properties
An instance of `Auth` has the following properties.

### cdk.authRole

_Type_ : [`Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Role.html)

### cdk.cfnIdentityPool

_Type_ : [`CfnIdentityPool`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CfnIdentityPool.html)

### cdk.unauthRole

_Type_ : [`Role`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Role.html)

### cdk.userPool?

_Type_ : [`IUserPool`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IUserPool.html)

### cdk.userPoolClient?

_Type_ : [`IUserPoolClient`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IUserPoolClient.html)


### cognitoIdentityPoolId

_Type_ : `string`

## Methods
An instance of `Auth` has the following methods.
### attachPermissionsForAuthUsers

```ts
attachPermissionsForAuthUsers(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsForTrigger

```ts
attachPermissionsForTrigger(triggerKey: unknown, permissions: Permissions)
```
_Parameters_
- __triggerKey__ 
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsForTriggers

```ts
attachPermissionsForTriggers(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsForUnauthUsers

```ts
attachPermissionsForUnauthUsers(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### getFunction

```ts
getFunction(triggerKey: unknown)
```
_Parameters_
- __triggerKey__ 
## AuthProps


### amazon?

_Type_ : [`AuthAmazonProps`](#authamazonprops)

### apple?

_Type_ : [`AuthAppleProps`](#authappleprops)

### auth0?

_Type_ : [`AuthAuth0Props`](#authauth0props)


### cdk.cfnIdentityPool?

_Type_ : [`AuthCdkCfnIdentityPoolProps`](#authcdkcfnidentitypoolprops)


### cognito?

_Type_ : `boolean`&nbsp; | &nbsp;[`AuthCognitoProps`](#authcognitoprops)

### cognitoUserPool?

_Type_ : [`IUserPool`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IUserPool.html)

### cognitoUserPoolClient?

_Type_ : [`IUserPoolClient`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IUserPoolClient.html)

### facebook?

_Type_ : [`AuthFacebookProps`](#authfacebookprops)

### google?

_Type_ : [`AuthGoogleProps`](#authgoogleprops)

### twitter?

_Type_ : [`AuthTwitterProps`](#authtwitterprops)

## AuthAppleProps


### servicesId

_Type_ : `string`

## AuthAuth0Props


### clientId

_Type_ : `string`

### domain

_Type_ : `string`

## AuthAmazonProps


### appId

_Type_ : `string`

## AuthGoogleProps


### clientId

_Type_ : `string`

## AuthCognitoProps



### cdk.userPool?

_Type_ : [`IUserPool`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IUserPool.html)&nbsp; | &nbsp;[`UserPoolProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.UserPoolProps.html)

### cdk.userPoolClient?

_Type_ : [`IUserPoolClient`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IUserPoolClient.html)&nbsp; | &nbsp;[`UserPoolClientOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.UserPoolClientOptions.html)



### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)


### signInAliases?

_Type_ : [`SignInAliases`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SignInAliases.html)

### triggers?

_Type_ : [`AuthUserPoolTriggers`](#authuserpooltriggers)

## AuthTwitterProps


### consumerKey

_Type_ : `string`

### consumerSecret

_Type_ : `string`

## AuthFacebookProps


### appId

_Type_ : `string`

## AuthUserPoolTriggers


### createAuthChallenge?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### customEmailSender?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### customMessage?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### customSmsSender?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### defineAuthChallenge?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### postAuthentication?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### postConfirmation?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### preAuthentication?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### preSignUp?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### preTokenGeneration?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### userMigration?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### verifyAuthChallengeResponse?

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## AuthCdkCfnIdentityPoolProps


### allowUnauthenticatedIdentities?

_Type_ : `boolean`
