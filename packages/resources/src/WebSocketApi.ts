import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cfnApig from "aws-cdk-lib/aws-apigatewayv2";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

import { App } from "./App";
import { Stack } from "./Stack";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";
import * as apigV2Domain from "./util/apiGatewayV2Domain";
import * as apigV2AccessLog from "./util/apiGatewayV2AccessLog";

/////////////////////
// Interfaces
/////////////////////

export interface WebSocketApiProps {
  cdk?: {
    webSocketApi?: apig.IWebSocketApi | apig.WebSocketApiProps;
    webSocketStage?: apig.IWebSocketStage | WebSocketApiCdkStageProps;
  };
  routes?: { [key: string]: FunctionDefinition };
  accessLog?: boolean | string | apigV2AccessLog.AccessLogProps;
  customDomain?: string | apigV2Domain.CustomDomainProps;
  authorizer?: "none" | "iam" | WebSocketApiLambdaAuthorizer;
  defaults?: {
    function?: FunctionProps;
  };
}

export interface WebSocketApiLambdaAuthorizer {
  type: "lambda";
  name?: string;
  identitySource?: string[];
  function?: Fn;
  cdk?: {
    authorizer: apigAuthorizers.WebSocketLambdaAuthorizer;
  };
}

export interface WebSocketApiCdkStageProps
  extends Omit<apig.WebSocketStageProps, "webSocketApi" | "stageName"> {
  stageName?: string;
}

/////////////////////
// Construct
/////////////////////

export class WebSocketApi extends Construct implements SSTConstruct {
  public readonly cdk: {
    webSocketApi: apig.WebSocketApi;
    webSocketStage: apig.WebSocketStage;
    accessLogGroup?: logs.LogGroup;
    domainName?: apig.DomainName;
    certificate?: acm.Certificate;
  };
  private _customDomainUrl?: string;
  private functions: { [key: string]: Fn };
  private permissionsAttachedForAllRoutes: Permissions[];
  private authorizer?:
    | "none"
    | "iam"
    | apigAuthorizers.WebSocketLambdaAuthorizer;
  private props: WebSocketApiProps;

  constructor(scope: Construct, id: string, props?: WebSocketApiProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.functions = {};
    this.permissionsAttachedForAllRoutes = [];

    this.createWebSocketApi();
    this.createWebSocketStage();
    this.addAuthorizer();
    this.addRoutes(this, this.props.routes || {});

    // Allows functions to make ApiGatewayManagementApi.postToConnection calls.
    this.attachPermissions([
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [this._connectionsArn],
      }),
    ]);
  }

  public get url(): string {
    return this.cdk.webSocketStage.url;
  }

  public get customDomainUrl(): string | undefined {
    return this._customDomainUrl;
  }

  public get routes(): string[] {
    return Object.keys(this.functions);
  }

  public get _connectionsArn(): string {
    return Stack.of(this).formatArn({
      service: "execute-api",
      resourceName: `${this.cdk.webSocketStage.stageName}/POST/*`,
      resource: this.cdk.webSocketApi.apiId,
    });
  }

  public addRoutes(
    scope: Construct,
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

  public getConstructMetadata() {
    return {
      type: "WebSocketApi" as const,
      data: {
        httpApiId: this.cdk.webSocketApi.apiId,
        customDomainUrl: this._customDomainUrl,
        routes: Object.entries(this.functions).map(([routeKey, fn]) => ({
          route: routeKey,
          fn: getFunctionRef(fn),
        })),
      },
    };
  }

  private createWebSocketApi() {
    const { cdk } = this.props;
    const id = this.node.id;
    const app = this.node.root as App;

    if (isCDKConstruct(cdk?.webSocketApi)) {
      this.cdk.webSocketApi = cdk?.webSocketApi as apig.WebSocketApi;
    } else {
      // Validate input
      if (isCDKConstruct(cdk?.webSocketStage)) {
        throw new Error(
          `Cannot import the "webSocketStage" when the "webSocketApi" is not imported.`
        );
      }

      const webSocketApiProps = (cdk?.webSocketApi ||
        {}) as apig.WebSocketApiProps;

      // Create WebSocket API
      this.cdk.webSocketApi = new apig.WebSocketApi(this, "Api", {
        apiName: app.logicalPrefixedName(id),
        ...webSocketApiProps,
      });
    }
  }

  private createWebSocketStage() {
    const { cdk, accessLog, customDomain } = this.props;

    if (isCDKConstruct(cdk?.webSocketStage)) {
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
      this.cdk.webSocketStage = cdk?.webSocketStage as apig.WebSocketStage;
    } else {
      const webSocketStageProps = (cdk?.webSocketStage ||
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
          this.cdk.domainName = customDomainData.apigDomain as apig.DomainName;
        }
        if (customDomainData.isCertificatedCreated) {
          this.cdk.certificate =
            customDomainData.certificate as acm.Certificate;
        }
        domainMapping = {
          domainName: customDomainData.apigDomain,
          mappingKey: customDomainData.mappingKey,
        };
        this._customDomainUrl = `wss://${customDomainData.url}`;
      }

      // Create stage
      this.cdk.webSocketStage = new apig.WebSocketStage(this, "Stage", {
        webSocketApi: this.cdk.webSocketApi,
        stageName: (this.node.root as App).stage,
        autoDeploy: true,
        domainMapping,
        ...webSocketStageProps,
      });

      // Configure Access Log
      this.cdk.accessLogGroup = apigV2AccessLog.buildAccessLogData(
        this,
        accessLog,
        this.cdk.webSocketStage,
        true
      );
    }
  }

  private addAuthorizer() {
    const { authorizer } = this.props;

    if (!authorizer || authorizer === "none") {
      this.authorizer = "none";
    } else if (authorizer === "iam") {
      this.authorizer = "iam";
    } else if (authorizer.cdk?.authorizer) {
      this.authorizer = authorizer.cdk.authorizer;
    } else if (!authorizer.function) {
      throw new Error(`Missing "function" for authorizer`);
    } else {
      this.authorizer = new apigAuthorizers.WebSocketLambdaAuthorizer(
        "Authorizer",
        authorizer.function,
        {
          authorizerName: authorizer.name,
          identitySource: authorizer.identitySource,
        }
      );
    }
  }

  private addRoute(
    scope: Construct,
    routeKey: string,
    routeValue: FunctionDefinition
  ): Fn {
    ///////////////////
    // Normalize routeKey
    ///////////////////
    routeKey = this.normalizeRouteKey(routeKey);
    if (this.functions[routeKey]) {
      throw new Error(`A route already exists for "${routeKey}"`);
    }

    ///////////////////
    // Create Function
    ///////////////////
    const lambda = Fn.fromDefinition(
      scope,
      routeKey,
      routeValue,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the routes using FunctionProps, so the Api construct can apply the "defaults.function" to them.`
    );

    ///////////////////
    // Get authorization
    ///////////////////
    const { authorizationType, authorizer } = this.buildRouteAuth();

    ///////////////////
    // Create route
    ///////////////////
    const route = new apig.WebSocketRoute(scope, `Route_${routeKey}`, {
      webSocketApi: this.cdk.webSocketApi,
      routeKey,
      integration: new apigIntegrations.WebSocketLambdaIntegration(
        `Integration_${routeKey}`,
        lambda
      ),
      authorizer: routeKey === "$connect" ? authorizer : undefined,
    });

    ///////////////////
    // Configure authorization
    ///////////////////

    // Note: as of CDK v1.138.0, aws-apigatewayv2.WebSocketRoute does not
    //       support IAM authorization type. We need to manually configure it.
    if (routeKey === "$connect") {
      // Configure route authorization type
      // Note: we need to explicitly set `cfnRoute.authorizationType` to `NONE`
      //       because if it were set to `AWS_IAM`, and then it is removed from
      //       the CloudFormation template (ie. set to undefined), CloudFormation
      //       doesn't updates the route. The route's authorizationType would
      //       still be `AWS_IAM`.
      const cfnRoute = route.node.defaultChild as cfnApig.CfnRoute;
      cfnRoute.authorizationType = authorizationType;
    }

    ///////////////////
    // Store function
    ///////////////////
    this.functions[routeKey] = lambda;

    return lambda;
  }

  private buildRouteAuth() {
    if (this.authorizer === "none") {
      return { authorizationType: "NONE" };
    } else if (this.authorizer === "iam") {
      return { authorizationType: "AWS_IAM" };
    }

    return {
      authorizationType: "CUSTOM",
      authorizer: this.authorizer,
    };
  }

  private normalizeRouteKey(routeKey: string): string {
    return routeKey.trim();
  }
}
