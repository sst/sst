---
description: "Docs for the sst.ApiGatewayV1Api construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new ApiGatewayV1Api(scope: Construct, id: string, props: ApiGatewayV1ApiProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`ApiGatewayV1ApiProps`](#apigatewayv1apiprops)
## Properties
An instance of `ApiGatewayV1Api` has the following properties.
### accessLogGroup

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

### acmCertificate

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)&nbsp; | &nbsp;[`DnsValidatedCertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DnsValidatedCertificate.html)

### apiGatewayDomain

_Type_ : [`DomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DomainName.html)

### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### restApi

_Type_ : [`RestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RestApi.html)

### routes

_Type_ : unknown

### url

_Type_ : `string`

## Methods
An instance of `ApiGatewayV1Api` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: unknown)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- routes unknown
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```
_Parameters_
- routeKey `string`
- permissions [`Permissions`](Permissions)
### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- routeKey `string`
## ApiGatewayV1ApiCustomDomainProps
### certificate

_Type_ : [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICertificate.html)

### domainName

_Type_ : `string`&nbsp; | &nbsp;[`IDomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IDomainName.html)

### endpointType

_Type_ : [`EndpointType`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.EndpointType.html)

### hostedZone

_Type_ : `string`&nbsp; | &nbsp;[`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IHostedZone.html)

### mtls

_Type_ : [`MTLSConfig`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.MTLSConfig.html)

### path

_Type_ : `string`

### securityPolicy

_Type_ : [`SecurityPolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SecurityPolicy.html)

## ApiGatewayV1ApiProps
### accessLog

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

### cors

_Type_ : `boolean`

### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`ApiGatewayV1ApiCustomDomainProps`](#apigatewayv1apicustomdomainprops)

### defaultAuthorizationScopes

_Type_ : unknown

### defaultAuthorizationType

_Type_ : [`AuthorizationType`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.AuthorizationType.html)

### defaultAuthorizer

_Type_ : [`IAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IAuthorizer.html)

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### importedPaths

_Type_ : unknown

### restApi

_Type_ : [`IRestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IRestApi.html)&nbsp; | &nbsp;[`RestApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RestApiProps.html)

### routes

_Type_ : unknown

## ApiGatewayV1ApiRouteProps
### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### integrationOptions

_Type_ : [`LambdaIntegrationOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaIntegrationOptions.html)

### methodOptions

_Type_ : [`MethodOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.MethodOptions.html)
