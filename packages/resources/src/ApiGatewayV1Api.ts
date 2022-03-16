import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as apigV1AccessLog from "./util/apiGatewayV1AccessLog";

import { App } from "./App";
import { Bucket } from "./Bucket";
import { Duration, toCdkDuration } from "./util/duration";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { Permissions } from "./util/permission";

const allowedMethods = [
  "ANY",
  "GET",
  "PUT",
  "POST",
  "HEAD",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

/////////////////////
// Interfaces
/////////////////////

export interface ApiGatewayV1ApiProps<
  Authorizers extends Record<string, ApiGatewayV1ApiAuthorizer> = Record<
    string,
    never
  >,
  AuthorizerKeys = keyof Authorizers
> {
  cdk?: {
    restApi?: apig.IRestApi | apig.RestApiProps;
    importedPaths?: { [path: string]: string };
  };
  routes?: Record<string, ApiGatewayV1ApiRouteProps<AuthorizerKeys>>;
  cors?: boolean;
  accessLog?: boolean | string | apigV1AccessLog.AccessLogProps;
  customDomain?: string | ApiGatewayV1ApiCustomDomainProps;
  authorizers?: Authorizers;
  defaults?: {
    function?: FunctionProps;
    authorizer?:
      | "none"
      | "iam"
      | (string extends AuthorizerKeys ? never : AuthorizerKeys);
    authorizationScopes?: string[];
  };
}

type ApiGatewayV1ApiRouteProps<AuthorizerKeys> =
  | FunctionInlineDefinition
  | ApiGatewayV1ApiFunctionRouteProps<AuthorizerKeys>;

export interface ApiGatewayV1ApiFunctionRouteProps<AuthorizerKeys = never> {
  function: FunctionDefinition;
  authorizer?:
    | "none"
    | "iam"
    | (string extends AuthorizerKeys ? never : AuthorizerKeys);
  authorizationScopes?: string[];
  cdk?: {
    method?: Omit<
      apig.MethodOptions,
      "authorizer" | "authorizationType" | "authorizationScopes"
    >;
    integration?: apig.LambdaIntegrationOptions;
  };
}

type ApiGatewayV1ApiAuthorizer =
  | ApiGatewayV1ApiUserPoolsAuthorizer
  | ApiGatewayV1ApiLambdaTokenAuthorizer
  | ApiGatewayV1ApiLambdaRequestAuthorizer;

interface ApiGatewayV1ApiBaseAuthorizer {
  authorizerName?: string;
  resultsCacheTtl?: Duration;
}

export interface ApiGatewayV1ApiUserPoolsAuthorizer
  extends ApiGatewayV1ApiBaseAuthorizer {
  type: "user_pools";
  userPoolIds?: string[];
  identitySource?: string;
  cdk?: {
    authorizer: apig.CognitoUserPoolsAuthorizer;
  };
}

export interface ApiGatewayV1ApiLambdaTokenAuthorizer
  extends ApiGatewayV1ApiBaseAuthorizer {
  type: "lambda_token";
  function?: Fn;
  identitySource?: string;
  validationRegex?: string;
  cdk?: {
    assumeRole?: iam.IRole;
    authorizer?: apig.TokenAuthorizer;
  };
}

export interface ApiGatewayV1ApiLambdaRequestAuthorizer
  extends ApiGatewayV1ApiBaseAuthorizer {
  type: "lambda_request";
  function?: Fn;
  identitySources?: string[];
  cdk?: {
    assumeRole?: iam.IRole;
    authorizer?: apig.TokenAuthorizer;
  };
}

export interface ApiGatewayV1ApiCustomDomainProps {
  domainName?: string;
  hostedZone?: string;
  path?: string;
  endpointType?: Lowercase<keyof typeof apig.EndpointType>;
  mtls?: {
    bucket: Bucket;
    key: string;
    version?: string;
  };
  securityPolicy?: "TLS 1.0" | "TLS 1.2";
  cdk?: {
    domainName?: apig.IDomainName;
    hostedZone?: route53.IHostedZone;
    certificate?: acm.ICertificate;
  };
}

/////////////////////
// Construct
/////////////////////

export class ApiGatewayV1Api<
    Authorizers extends Record<string, ApiGatewayV1ApiAuthorizer> = Record<
      string,
      never
    >
  >
  extends Construct
  implements SSTConstruct
{
  public readonly cdk: {
    restApi: apig.RestApi;
    accessLogGroup?: logs.LogGroup;
    domainName?: apig.DomainName;
    certificate?: acm.Certificate | acm.DnsValidatedCertificate;
  };
  private _deployment?: apig.Deployment;
  private _customDomainUrl?: string;
  private importedResources: { [path: string]: apig.IResource };
  private props: ApiGatewayV1ApiProps<Authorizers>;
  private functions: { [key: string]: Fn };
  private authorizersData: Record<string, apig.IAuthorizer>;
  private permissionsAttachedForAllRoutes: Permissions[];

  constructor(
    scope: Construct,
    id: string,
    props?: ApiGatewayV1ApiProps<Authorizers>
  ) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.functions = {};
    this.authorizersData = {};
    this.importedResources = {};
    this.permissionsAttachedForAllRoutes = [];

    this.createRestApi();
    this.addAuthorizers(this.props.authorizers || ({} as Authorizers));
    this.addRoutes(this, this.props.routes || {});
  }

  public get url(): string {
    return this.cdk.restApi.url;
  }

  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  public get routes(): string[] {
    return Object.keys(this.functions);
  }

  public addRoutes(
    scope: Construct,
    routes: Record<string, ApiGatewayV1ApiRouteProps<keyof Authorizers>>
  ): void {
    Object.keys(routes).forEach((routeKey: string) => {
      // add route
      const fn = this.addRoute(scope, routeKey, routes[routeKey]);

      // attached existing permissions
      this.permissionsAttachedForAllRoutes.forEach((permissions) =>
        fn.attachPermissions(permissions)
      );
    });
  }

  public getFunction(routeKey: string): Fn | undefined {
    return this.functions[this.normalizeRouteKey(routeKey)];
  }

  public attachPermissions(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllRoutes.push(permissions);
  }

  public getConstructMetadata() {
    return {
      type: "ApiGatewayV1Api" as const,
      data: {
        customDomainUrl: this._customDomainUrl,
        url: this.cdk.restApi.url,
        restApiId: this.cdk.restApi.restApiId,
        routes: Object.entries(this.functions).map(([key, data]) => {
          return {
            route: key,
            fn: getFunctionRef(data),
          };
        }),
      },
    };
  }

  public attachPermissionsToRoute(
    routeKey: string,
    permissions: Permissions
  ): void {
    const fn = this.getFunction(routeKey);
    if (!fn) {
      throw new Error(
        `Failed to attach permissions. Route "${routeKey}" does not exist.`
      );
    }

    fn.attachPermissions(permissions);
  }

  private createRestApi() {
    const { cdk, cors, accessLog, customDomain } = this.props;
    const id = this.node.id;
    const app = this.node.root as App;

    if (isCDKConstruct(cdk?.restApi)) {
      if (cors !== undefined) {
        throw new Error(
          `Cannot configure the "cors" when the "restApi" is imported`
        );
      }
      if (accessLog !== undefined) {
        throw new Error(
          `Cannot configure the "accessLog" when the "restApi" is imported`
        );
      }
      if (customDomain !== undefined) {
        throw new Error(
          `Cannot configure the "customDomain" when the "restApi" is imported`
        );
      }
      this.cdk.restApi = cdk?.restApi as apig.RestApi;

      // Create an API Gateway deployment resource to trigger a deployment
      this._deployment = new apig.Deployment(this, "Deployment", {
        api: this.cdk.restApi,
      });
      const cfnDeployment = this._deployment.node
        .defaultChild as apig.CfnDeployment;
      cfnDeployment.stageName = app.stage;

      if (cdk?.importedPaths) {
        this.importResources(cdk?.importedPaths);
      }
    } else {
      const restApiProps = (cdk?.restApi || {}) as apig.RestApiProps;

      // Validate input
      if (cdk?.importedPaths !== undefined) {
        throw new Error(`Cannot import route paths when creating a new API.`);
      }
      if (customDomain !== undefined && restApiProps.domainName !== undefined) {
        throw new Error(
          `Use either the "customDomain" or the "restApi.domainName" to configure the Api domain. Do not use both.`
        );
      }
      if (
        cors !== undefined &&
        restApiProps.defaultCorsPreflightOptions !== undefined
      ) {
        throw new Error(
          `Use either the "cors" or the "restApi.defaultCorsPreflightOptions" to configure the Api's CORS config. Do not use both.`
        );
      }
      if (
        accessLog !== undefined &&
        restApiProps.deployOptions?.accessLogDestination !== undefined
      ) {
        throw new Error(
          `Use either the "accessLog" or the "restApi.deployOptions.accessLogDestination" to configure the Api's access log. Do not use both.`
        );
      }
      if (
        accessLog !== undefined &&
        restApiProps.deployOptions?.accessLogFormat !== undefined
      ) {
        throw new Error(
          `Use either the "accessLog" or the "restApi.deployOptions.accessLogFormat" to configure the Api's access log. Do not use both.`
        );
      }

      const stageName =
        restApiProps.deployOptions?.stageName || (this.node.root as App).stage;

      const accessLogData = apigV1AccessLog.buildAccessLogData(this, accessLog);

      this.cdk.accessLogGroup = accessLogData?.logGroup;

      this.cdk.restApi = new apig.RestApi(this, "Api", {
        restApiName: app.logicalPrefixedName(id),
        ...restApiProps,
        domainName: restApiProps.domainName,
        defaultCorsPreflightOptions:
          restApiProps.defaultCorsPreflightOptions ||
          this.buildCorsConfig(cors),
        deployOptions: {
          ...(restApiProps.deployOptions || {}),
          accessLogDestination:
            restApiProps.deployOptions?.accessLogDestination ||
            accessLogData?.destination,
          accessLogFormat:
            restApiProps.deployOptions?.accessLogFormat ||
            accessLogData?.format,

          // default to the name of the sage
          stageName: stageName,

          // default to true
          tracingEnabled:
            restApiProps.deployOptions?.tracingEnabled === undefined
              ? true
              : restApiProps.deployOptions?.tracingEnabled,
        },
      });

      this.createCustomDomain(customDomain);
      this.createGatewayResponseForCors(cors);
    }
  }

  private buildCorsConfig(cors?: boolean): apig.CorsOptions | undefined {
    // Case: cors is false
    if (cors === false) {
      return undefined;
    }

    // Case: cors is true or undefined
    return {
      allowOrigins: apig.Cors.ALL_ORIGINS,
    } as apig.CorsOptions;
  }

  private createGatewayResponseForCors(cors?: boolean): void {
    if (!cors) {
      return;
    }

    this.cdk.restApi.addGatewayResponse("GatewayResponseDefault4XX", {
      type: apig.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
    });

    this.cdk.restApi.addGatewayResponse("GatewayResponseDefault5XX", {
      type: apig.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        "Access-Control-Allow-Origin": "'*'",
        "Access-Control-Allow-Headers": "'*'",
      },
    });
  }

  private createCustomDomain(
    customDomain?: string | ApiGatewayV1ApiCustomDomainProps
  ): void {
    // Case: customDomain is not set
    if (customDomain === undefined) {
      return;
    }

    // To be implemented: to allow more flexible use cases, SST should support 3 more use cases:
    //  1. Allow user passing in `hostedZone` object. The use case is when there are multiple
    //     HostedZones with the same domain, but one is public, and one is private.
    //  2. Allow user passing in `certificate` object. The use case is for user to create wildcard
    //     certificate or using an imported certificate.
    //  3. Allow user passing in `apigDomainName` object. The use case is a user creates multiple API
    //     endpoints, and is mapping them under the same custom domain. `sst.Api` needs to expose the
    //     `apigDomainName` construct created in the first Api, and lets user pass it in when creating
    //     the second Api.

    let domainName,
      hostedZone,
      hostedZoneDomain,
      certificate,
      apigDomainName,
      basePath,
      endpointType,
      mtls,
      securityPolicy;

    /////////////////////
    // Parse input
    /////////////////////

    // Case: customDomain is a string
    if (typeof customDomain === "string") {
      // validate: customDomain is a TOKEN string
      // ie. imported SSM value: ssm.StringParameter.valueForStringParameter()
      if (cdk.Token.isUnresolved(customDomain)) {
        throw new Error(
          `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
        );
      }

      domainName = customDomain;
      this.assertDomainNameIsLowerCase(domainName);
      hostedZoneDomain = customDomain.split(".").slice(1).join(".");
    }

    // Case: customDomain.domainName is a string
    else if (customDomain.domainName) {
      domainName = customDomain.domainName;

      // parse customDomain.domainName
      if (cdk.Token.isUnresolved(customDomain.domainName)) {
        // If customDomain is a TOKEN string, "hostedZone" has to be passed in. This
        // is because "hostedZone" cannot be parsed from a TOKEN value.
        if (!customDomain.hostedZone) {
          throw new Error(
            `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
          );
        }
        domainName = customDomain.domainName;
      } else {
        domainName = customDomain.domainName;
        this.assertDomainNameIsLowerCase(domainName);
      }

      // parse customDomain.hostedZone
      if (!customDomain.hostedZone) {
        hostedZoneDomain = domainName.split(".").slice(1).join(".");
      } else if (typeof customDomain.hostedZone === "string") {
        hostedZoneDomain = customDomain.hostedZone;
      } else {
        hostedZone = customDomain.hostedZone;
      }

      certificate = customDomain.cdk?.certificate;
      basePath = customDomain.path;
      endpointType = customDomain.endpointType;
      mtls = customDomain.mtls;
      securityPolicy = customDomain.securityPolicy;
    }

    // Case: customDomain.domainName is a construct
    else if (customDomain.cdk?.domainName) {
      apigDomainName = customDomain.cdk.domainName;

      // customDomain.domainName is imported
      if (
        apigDomainName &&
        (customDomain.hostedZone || customDomain.cdk?.hostedZone)
      ) {
        throw new Error(
          `Cannot configure the "hostedZone" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.cdk?.certificate) {
        throw new Error(
          `Cannot configure the "certificate" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.endpointType) {
        throw new Error(
          `Cannot configure the "endpointType" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.mtls) {
        throw new Error(
          `Cannot configure the "mtls" when the "domainName" is a construct`
        );
      }
      if (apigDomainName && customDomain.securityPolicy) {
        throw new Error(
          `Cannot configure the "securityPolicy" when the "domainName" is a construct`
        );
      }

      basePath = customDomain.path;
    }

    /////////////////////
    // Find hosted zone
    /////////////////////
    if (!apigDomainName && !hostedZone) {
      // Look up hosted zone
      if (!hostedZone && hostedZoneDomain) {
        hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
          domainName: hostedZoneDomain,
        });
      }
    }

    /////////////////////
    // Create certificate
    /////////////////////
    if (!apigDomainName && !certificate) {
      if (endpointType === "edge") {
        certificate = new acm.DnsValidatedCertificate(
          this,
          "CrossRegionCertificate",
          {
            domainName: domainName as string,
            hostedZone: hostedZone as route53.IHostedZone,
            region: "us-east-1",
          }
        );
      } else {
        certificate = new acm.Certificate(this, "Certificate", {
          domainName: domainName as string,
          validation: acm.CertificateValidation.fromDns(hostedZone),
        });
      }
      this.cdk.certificate = certificate;
    }

    /////////////////////
    // Create API Gateway domain name
    /////////////////////
    if (!apigDomainName && domainName) {
      // Create custom domain in API Gateway
      apigDomainName = new apig.DomainName(this, "DomainName", {
        domainName,
        certificate: certificate as acm.ICertificate,
        endpointType:
          endpointType &&
          apig.EndpointType[
            endpointType.toLocaleUpperCase() as keyof typeof apig.EndpointType
          ],
        mtls: mtls && {
          ...mtls,
          bucket: mtls.bucket.cdk.bucket,
        },
        securityPolicy:
          securityPolicy === "TLS 1.0"
            ? apig.SecurityPolicy.TLS_1_0
            : securityPolicy === "TLS 1.2"
            ? apig.SecurityPolicy.TLS_1_2
            : undefined,
      });
      this.cdk.domainName = apigDomainName;

      // Create DNS record
      this.createARecords(
        hostedZone as route53.IHostedZone,
        domainName,
        apigDomainName
      );
    }

    /////////////////////
    // Create base mapping
    /////////////////////
    if (apigDomainName) {
      new apig.BasePathMapping(this, "BasePath", {
        domainName: apigDomainName,
        restApi: this.cdk.restApi,
        basePath,
      });
    }

    // Note: We only know the full custom domain if domainName is a string.
    //       _customDomainUrl will be undefined if apigDomainName is imported.
    if (domainName && !cdk.Token.isUnresolved(domainName)) {
      this._customDomainUrl = basePath
        ? `https://${domainName}/${basePath}/`
        : `https://${domainName}`;
    }
  }

  private createARecords(
    hostedZone: route53.IHostedZone,
    domainName: string,
    apigDomain: apig.IDomainName
  ) {
    // create DNS record
    const recordProps = {
      recordName: domainName,
      zone: hostedZone as route53.IHostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGatewayDomain(apigDomain)
      ),
    };
    const records = [
      new route53.ARecord(this, "AliasRecord", recordProps),
      new route53.AaaaRecord(this, "AliasRecordAAAA", recordProps),
    ];
    // note: If domainName is a TOKEN string ie. ${TOKEN..}, the route53.ARecord
    //       construct will append ".${hostedZoneName}" to the end of the domain.
    //       This is because the construct tries to check if the record name
    //       ends with the domain name. If not, it will append the domain name.
    //       So, we need remove this behavior.
    if (cdk.Token.isUnresolved(domainName)) {
      records.forEach((record) => {
        const cfnRecord = record.node.defaultChild as route53.CfnRecordSet;
        cfnRecord.name = domainName;
      });
    }
  }

  private importResources(resources: { [path: string]: string }): void {
    Object.keys(resources).forEach((path) => {
      const resource = apig.Resource.fromResourceAttributes(
        this,
        `Resource_${path}`,
        {
          path,
          resourceId: resources[path],
          restApi: this.cdk.restApi,
        }
      );
      this.importedResources[path] = resource;
    });
  }

  private getResourceForPath(path: string): apig.IResource {
    // Lookup exact match imported resource
    if (this.importedResources[path]) {
      return this.importedResources[path];
    }

    // Lookup parents matching imported resource first
    const parts = path.split("/");
    for (let i = parts.length; i >= 1; i--) {
      const partialPath = parts.slice(0, i).join("/");
      if (this.importedResources[partialPath]) {
        return this.importedResources[partialPath].resourceForPath(
          parts.slice(i).join("/")
        );
      }
    }

    // Not child of imported resources, create off the root
    return this.cdk.restApi.root.resourceForPath(path);
  }

  private addAuthorizers(authorizers: Authorizers) {
    Object.entries(authorizers).forEach(([key, value]) => {
      if (key === "none") {
        throw new Error(`Cannot name an authorizer "none"`);
      } else if (key === "iam") {
        throw new Error(`Cannot name an authorizer "iam"`);
      } else if (value.type === "user_pools") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.userPoolIds) {
            throw new Error(`Missing "userPoolIds" for "${key}" authorizer`);
          }
          const userPools = value.userPoolIds.map((userPoolId) =>
            cognito.UserPool.fromUserPoolId(
              this,
              `Api-${this.node.id}-Authorizer-${key}-UserPool`,
              userPoolId
            )
          );
          this.authorizersData[key] = new apig.CognitoUserPoolsAuthorizer(
            this,
            `Api-${this.node.id}-Authorizer-${key}`,
            {
              cognitoUserPools: userPools,
              authorizerName: value.authorizerName,
              identitySource: value.identitySource,
              resultsCacheTtl: value.resultsCacheTtl
                ? toCdkDuration(value.resultsCacheTtl)
                : cdk.Duration.seconds(0),
            }
          );
        }
      } else if (value.type === "lambda_token") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.function) {
            throw new Error(`Missing "function" for "${key}" authorizer`);
          }
          this.authorizersData[key] = new apig.TokenAuthorizer(
            this,
            `Api-${this.node.id}-Authorizer-${key}`,
            {
              handler: value.function,
              authorizerName: value.authorizerName,
              identitySource: value.identitySource,
              validationRegex: value.validationRegex,
              assumeRole: value.cdk?.assumeRole,
              resultsCacheTtl: value.resultsCacheTtl
                ? toCdkDuration(value.resultsCacheTtl)
                : cdk.Duration.seconds(0),
            }
          );
        }
      } else if (value.type === "lambda_request") {
        if (value.cdk?.authorizer) {
          this.authorizersData[key] = value.cdk.authorizer;
        } else {
          if (!value.function) {
            throw new Error(`Missing "function" for "${key}" authorizer`);
          } else if (!value.identitySources) {
            throw new Error(
              `Missing "identitySources" for "${key}" authorizer`
            );
          }
          this.authorizersData[key] = new apig.RequestAuthorizer(
            this,
            `Api-${this.node.id}-Authorizer-${key}`,
            {
              handler: value.function,
              authorizerName: value.authorizerName,
              identitySources: value.identitySources,
              assumeRole: value.cdk?.assumeRole,
              resultsCacheTtl: value.resultsCacheTtl
                ? toCdkDuration(value.resultsCacheTtl)
                : cdk.Duration.seconds(0),
            }
          );
        }
      }
    });
  }

  private addRoute(
    scope: Construct,
    routeKey: string,
    routeValue: ApiGatewayV1ApiRouteProps<keyof Authorizers>
  ): Fn {
    // Normalize routeKey
    ///////////////////
    routeKey = this.normalizeRouteKey(routeKey);
    if (this.functions[routeKey]) {
      throw new Error(`A route already exists for "${routeKey}"`);
    }

    ///////////////////
    // Get path and method
    ///////////////////
    const routeKeyParts = routeKey.split(" ");
    if (routeKeyParts.length !== 2) {
      throw new Error(`Invalid route ${routeKey}`);
    }
    const methodStr = routeKeyParts[0].toUpperCase();
    const path = routeKeyParts[1];
    const method = allowedMethods.find((per) => per === methodStr);
    if (!method) {
      throw new Error(`Invalid method defined for "${routeKey}"`);
    }
    if (path.length === 0) {
      throw new Error(`Invalid path defined for "${routeKey}"`);
    }

    ///////////////////
    // Create Resources
    ///////////////////
    let resource;
    if (path.endsWith("/{proxy+}")) {
      const parentResource = this.getResourceForPath(
        path.split("/").slice(0, -1).join("/")
      );
      resource = parentResource.addProxy({ anyMethod: false });
    } else {
      resource = this.getResourceForPath(path);
    }

    ///////////////////
    // Create Method
    ///////////////////
    const routeProps = Fn.isInlineDefinition(routeValue)
      ? ({ function: routeValue } as ApiGatewayV1ApiFunctionRouteProps<
          keyof Authorizers
        >)
      : (routeValue as ApiGatewayV1ApiFunctionRouteProps<keyof Authorizers>);
    const lambda = Fn.fromDefinition(
      scope,
      `Lambda_${methodStr}_${path}`,
      routeProps.function,
      this.props.defaults?.function,
      `The "default.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaults.functionProps" to them.`
    );
    const integration = new apig.LambdaIntegration(
      lambda,
      routeProps.cdk?.integration
    );
    const methodOptions = this.buildRouteMethodOptions(routeProps);
    const apigMethod = resource.addMethod(method, integration, methodOptions);

    // Add an environment variable to determine if the function is an Api route.
    // If it is, when "sst start" is not connected, we want to return an 500
    // status code and a descriptive error message.
    const root = scope.node.root as App;
    if (root.local) {
      lambda.addEnvironment("SST_DEBUG_IS_API_ROUTE", "1", {
        removeInEdge: true,
      });
    }

    ///////////////////
    // Handle manually created Deployment resource (ie. imported REST API)
    ///////////////////
    if (this._deployment) {
      this._deployment.addToLogicalId({ route: { routeKey, routeValue } });
      this._deployment.node.addDependency(apigMethod);
    }

    ///////////////////
    // Store function
    ///////////////////
    this.functions[routeKey] = lambda;

    return lambda;
  }

  private buildRouteMethodOptions(
    routeProps: ApiGatewayV1ApiFunctionRouteProps<keyof Authorizers>
  ): apig.MethodOptions {
    const authorizerKey =
      routeProps.authorizer || this.props.defaults?.authorizer || "none";
    if (authorizerKey === "none") {
      return {
        authorizationType: apig.AuthorizationType.NONE,
        ...routeProps.cdk?.method,
      };
    } else if (authorizerKey === "iam") {
      return {
        authorizationType: apig.AuthorizationType.IAM,
        ...routeProps.cdk?.method,
      };
    }

    if (!this.props.authorizers || !this.props.authorizers[authorizerKey]) {
      throw new Error(`Cannot find authorizer "${authorizerKey}"`);
    }

    const authorizer = this.authorizersData[authorizerKey as string];
    const authorizationType = this.props.authorizers[authorizerKey].type;
    if (authorizationType === "user_pools") {
      return {
        authorizationType: apig.AuthorizationType.COGNITO,
        authorizer,
        authorizationScopes:
          routeProps.authorizationScopes ||
          this.props.defaults?.authorizationScopes,
        ...routeProps.cdk?.method,
      };
    }

    return {
      authorizationType: apig.AuthorizationType.CUSTOM,
      authorizer,
      ...routeProps.cdk?.method,
    };
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.split(/\s+/).join(" ");
  }

  private assertDomainNameIsLowerCase(domainName: string): void {
    if (domainName !== domainName.toLowerCase()) {
      throw new Error(`The domain name needs to be in lowercase`);
    }
  }
}
