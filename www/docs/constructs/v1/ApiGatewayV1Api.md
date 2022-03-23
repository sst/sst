---
description: "Docs for the sst.ApiGatewayV1Api construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->


## Constructor
```ts
new ApiGatewayV1Api(scope: Construct, id: string, props: ApiGatewayV1ApiProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`ApiGatewayV1ApiProps`](#apigatewayv1apiprops)
## Properties
An instance of `ApiGatewayV1Api` has the following properties.
### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### routes

_Type_ : Array< `string` >

### url

_Type_ : `string`


### cdk.accessLogGroup?

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

### cdk.certificate?

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)&nbsp; | &nbsp;[`DnsValidatedCertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DnsValidatedCertificate.html)

### cdk.domainName?

_Type_ : [`DomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DomainName.html)

### cdk.restApi

_Type_ : [`RestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RestApi.html)


## Methods
An instance of `ApiGatewayV1Api` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: Record)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __routes__ Record<`string`, [`ApiGatewayV1ApiRouteProps`](ApiGatewayV1ApiRouteProps)>
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```
_Parameters_
- __routeKey__ `string`
- __permissions__ [`Permissions`](Permissions)
### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- __routeKey__ `string`
## ApiGatewayV1ApiProps


### accessLog?

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

### authorizers?

_Type_ : [`Authorizers`](Authorizers)

### cors?

_Type_ : `boolean`

### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`ApiGatewayV1ApiCustomDomainProps`](#apigatewayv1apicustomdomainprops)


### defaults.authorizationScopes?

_Type_ : Array< `string` >

### defaults.authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)


### routes?

_Type_ : Record<`string`, [`ApiGatewayV1ApiRouteProps`](ApiGatewayV1ApiRouteProps)>





### cdk.restApi?

_Type_ : [`IRestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IRestApi.html)&nbsp; | &nbsp;[`RestApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RestApiProps.html)


## ApiGatewayV1ApiCustomDomainProps


### domainName?

_Type_ : `string`

### endpointType?

_Type_ : `"edge"`&nbsp; | &nbsp;`"regional"`&nbsp; | &nbsp;`"private"`

### hostedZone?

_Type_ : `string`


### mtls.bucket

_Type_ : [`Bucket`](Bucket)

### mtls.key

_Type_ : `string`

### mtls.version?

_Type_ : `string`


### path?

_Type_ : `string`

### securityPolicy?

_Type_ : `"TLS 1.0"`&nbsp; | &nbsp;`"TLS 1.2"`


### cdk.certificate?

_Type_ : [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICertificate.html)

### cdk.domainName?

_Type_ : [`IDomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IDomainName.html)

### cdk.hostedZone?

_Type_ : [`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IHostedZone.html)


## ApiGatewayV1ApiFunctionRouteProps


### authorizationScopes?

_Type_ : Array< `string` >

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)


### cdk.integration?

_Type_ : [`LambdaIntegrationOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaIntegrationOptions.html)

### cdk.method?

_Type_ : Omit<[`MethodOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.MethodOptions.html), `"authorizationScopes"`&nbsp; | &nbsp;`"authorizer"`&nbsp; | &nbsp;`"authorizationType"`>


## ApiGatewayV1ApiUserPoolsAuthorizer


### authorizerName?

_Type_ : `string`

### identitySource?

_Type_ : `string`

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"user_pools"`

### userPoolIds?

_Type_ : Array< `string` >


### cdk.authorizer

_Type_ : [`CognitoUserPoolsAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CognitoUserPoolsAuthorizer.html)


## ApiGatewayV1ApiLambdaTokenAuthorizer


### authorizerName?

_Type_ : `string`

### function?

_Type_ : [`Function`](Function)

### identitySource?

_Type_ : `string`

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"lambda_token"`

### validationRegex?

_Type_ : `string`


### cdk.assumeRole?

_Type_ : [`IRole`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IRole.html)

### cdk.authorizer?

_Type_ : [`TokenAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TokenAuthorizer.html)


## ApiGatewayV1ApiLambdaRequestAuthorizer


### authorizerName?

_Type_ : `string`

### function?

_Type_ : [`Function`](Function)

### identitySources?

_Type_ : Array< `string` >

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"lambda_request"`


### cdk.assumeRole?

_Type_ : [`IRole`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IRole.html)

### cdk.authorizer?

_Type_ : [`TokenAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TokenAuthorizer.html)

