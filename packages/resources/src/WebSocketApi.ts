import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as logs from "@aws-cdk/aws-logs";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import { App } from "./App";
import { Stack } from "./Stack";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";
import * as apigV2Domain from "./util/apiGatewayV2Domain";
import * as apigV2AccessLog from "./util/apiGatewayV2AccessLog";

export enum WebSocketApiAuthorizationType {
  NONE = "NONE",
  IAM = "AWS_IAM",
}

/////////////////////
// Interfaces
/////////////////////

export interface WebSocketApiProps {
  readonly webSocketApi?: apig.IWebSocketApi | apig.WebSocketApiProps;
  readonly webSocketStage?: apig.IWebSocketStage | WebSocketApiCdkStageProps;
  readonly routes?: { [key: string]: FunctionDefinition };
  readonly accessLog?:
    | boolean
    | string
    | apig.CfnStage.AccessLogSettingsProperty;
  readonly customDomain?: string | WebSocketApiCustomDomainProps;
  readonly authorizationType?: WebSocketApiAuthorizationType;
  readonly defaultFunctionProps?: FunctionProps;
}

export type WebSocketApiCustomDomainProps = apigV2Domain.CustomDomainProps;

export interface WebSocketApiCdkStageProps
  extends Omit<apig.WebSocketStageProps, "webSocketApi" | "stageName"> {
  readonly stageName?: string;
}

/////////////////////
// Construct
/////////////////////

export class WebSocketApi extends cdk.Construct {
  public readonly webSocketApi: apig.WebSocketApi;
  public readonly webSocketStage: apig.WebSocketStage;
  public readonly url: string;
  public readonly customDomainUrl?: string;
  public readonly accessLogGroup?: logs.LogGroup;
  public readonly apiGatewayDomain?: apig.DomainName;
  public readonly acmCertificate?: acm.Certificate;
  private readonly functions: { [key: string]: Fn };
  private readonly permissionsAttachedForAllRoutes: Permissions[];
  private readonly authorizationType?: WebSocketApiAuthorizationType;
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: cdk.Construct, id: string, props?: WebSocketApiProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      webSocketApi,
      webSocketStage,
      routes,
      accessLog,
      customDomain,
      authorizationType,
      defaultFunctionProps,
    } = props || {};
    this.functions = {};
    this.permissionsAttachedForAllRoutes = [];
    this.authorizationType = authorizationType;
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Create Api
    ////////////////////

    if (cdk.Construct.isConstruct(webSocketApi)) {
      this.webSocketApi = webSocketApi as apig.WebSocketApi;
    } else {
      // Validate input
      if (cdk.Construct.isConstruct(webSocketStage)) {
        throw new Error(
          `Cannot import the "webSocketStage" when the "webSocketApi" is not imported.`
        );
      }

      const webSocketApiProps = (webSocketApi || {}) as apig.WebSocketApiProps;

      // Create WebSocket API
      this.webSocketApi = new apig.WebSocketApi(this, "Api", {
        apiName: root.logicalPrefixedName(id),
        ...webSocketApiProps,
      });
    }

    ////////////////////
    // Create Stage
    ////////////////////

    if (cdk.Construct.isConstruct(webSocketStage)) {
      if (accessLog !== undefined) {
        throw new Error(
          `Cannot configure the "accessLog" when "webSocketStage" is a construct`
        );
      }
      if (customDomain !== undefined) {
        throw new Error(
          `Cannot configure the "customDomain" when "webSocketStage" is a construct`
        );
      }
      this.webSocketStage = webSocketStage as apig.WebSocketStage;
    } else {
      const webSocketStageProps = (webSocketStage ||
        {}) as WebSocketApiCdkStageProps;

      // Validate input
      if (webSocketStageProps.domainMapping !== undefined) {
        throw new Error(
          `Do not configure the "webSocketStage.domainMapping". Use the "customDomain" to configure the Api domain.`
        );
      }

      // Configure Custom Domain
      const customDomainData = apigV2Domain.buildCustomDomainData(
        this,
        customDomain
      );
      let domainMapping;
      if (customDomainData) {
        if (customDomainData.isApigDomainCreated) {
          this.apiGatewayDomain = customDomainData.apigDomain as apig.DomainName;
        }
        if (customDomainData.isCertificatedCreated) {
          this.acmCertificate = customDomainData.certificate as acm.Certificate;
        }
        domainMapping = {
          domainName: customDomainData.apigDomain,
          mappingKey: customDomainData.mappingKey,
        };
        this.customDomainUrl = `wss://${customDomainData.url}`;
      }

      // Create stage
      this.webSocketStage = new apig.WebSocketStage(this, "Stage", {
        webSocketApi: this.webSocketApi,
        stageName: (this.node.root as App).stage,
        autoDeploy: true,
        domainMapping,
        ...webSocketStageProps,
      });

      // Configure Access Log
      this.accessLogGroup = apigV2AccessLog.buildAccessLogData(
        this,
        accessLog,
        this.webSocketStage
      );
    }
    this.url = this.webSocketStage.url;

    ///////////////////////////
    // Configure default permissions
    ///////////////////////////
    // note: this allows functions to make ApiGatewayManagementApi.postToConnection
    //       calls.
    const connectionsArn = Stack.of(this).formatArn({
      service: "execute-api",
      resourceName: `${this.webSocketStage.stageName}/POST/*`,
      resource: this.webSocketApi.apiId,
    });
    this.attachPermissions([
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [connectionsArn],
      }),
    ]);

    ///////////////////////////
    // Configure routes
    ///////////////////////////

    if (routes) {
      this.addRoutes(this, routes);
    }
  }

  public addRoutes(
    scope: cdk.Construct,
    routes: {
      [key: string]: FunctionDefinition;
    }
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

  private addRoute(
    scope: cdk.Construct,
    routeKey: string,
    routeValue: FunctionDefinition
  ): Fn {
    // Normalize routeKey
    routeKey = this.normalizeRouteKey(routeKey);

    ///////////////////
    // Create Function
    ///////////////////
    const lambda = Fn.fromDefinition(
      scope,
      routeKey,
      routeValue,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaultFunctionProps" to them.`
    );

    ///////////////////
    // Create route
    ///////////////////
    const route = new apig.WebSocketRoute(scope, `Route_${routeKey}`, {
      webSocketApi: this.webSocketApi,
      routeKey,
      integration: new apigIntegrations.LambdaWebSocketIntegration({
        handler: lambda,
      }),
    });

    ///////////////////
    // Configure authorization
    ///////////////////
    const authorizationType =
      this.authorizationType || WebSocketApiAuthorizationType.NONE;
    if (
      !Object.values(WebSocketApiAuthorizationType).includes(authorizationType)
    ) {
      throw new Error(
        `sst.WebSocketApi does not currently support ${authorizationType}. Only "IAM" is currently supported.`
      );
    }

    if (routeKey === "$connect") {
      // Configure route authorization type
      // Note: we need to explicitly set `cfnRoute.authorizationType` to `NONE` because if it were
      //       set to `AWS_IAM`, and then it is removed from the CloudFormation template
      //       (ie. set to undefined), CloudFormation doesn't updates the route. The route's
      //       authorizationType would still be `AWS_IAM`.
      if (
        authorizationType === WebSocketApiAuthorizationType.IAM ||
        authorizationType === WebSocketApiAuthorizationType.NONE
      ) {
        if (!route.node.defaultChild) {
          throw new Error(
            `Failed to define the default route for "${routeKey}"`
          );
        }
        const cfnRoute = route.node.defaultChild as apig.CfnRoute;
        cfnRoute.authorizationType = authorizationType;
      }
    }

    ///////////////////
    // Store function
    ///////////////////
    this.functions[routeKey] = lambda;

    return lambda;
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.trim();
  }
}
