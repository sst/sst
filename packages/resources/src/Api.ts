import * as cdk from "@aws-cdk/core";
import * as logs from "@aws-cdk/aws-logs";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigIntegrations from "@aws-cdk/aws-apigatewayv2-integrations";

import { Function, FunctionProps } from "./Function";

export interface ApiProps extends apig.HttpApiProps {
  /**
   * Path to the entry point of the function. A .js or .ts file.
   */
  readonly routes: { [key: string]: string | RouteProps };

  /**
   * CORS configuration.
   *
   * @default - Defaults to true
   */
  readonly cors?: boolean;

  /**
   * Access log configuration.
   *
   * @default - Defaults to true
   */
  readonly accessLog?: boolean | AccessLogProps;

  /**
   * Default authorization type for routes.
   *
   * @default - Defaults to 'NONE'
   */
  readonly defaultAuthorizationType?: string;

  /**
   * Default Lambda props for routes.
   */
  readonly defaultLambdaProps?: FunctionProps;
}

/**
 * Props for API route.
 */
export interface RouteProps {
  /**
   * Route authorization type
   *
   * @default - Defaults to 'NONE'
   */
  readonly authorizationType?: string;

  /**
   * The runtime environment. Only runtimes of the Node.js family are
   * supported.
   *
   * @default - Defaults to {}
   */
  readonly lambdaProps?: FunctionProps;
}

/**
 * Props for Access log.
 */
export interface AccessLogProps {
  /**
   * Access log format.
   */
  readonly format: string;
}

export class Api extends apig.HttpApi {
  constructor(scope: cdk.Construct, id: string, props: ApiProps) {

    const { cors, accessLog, routes, defaultAuthorizationType, defaultLambdaProps } = props;

    ////////////////////
    // Configure CORS
    ////////////////////

    // note: If both cors and corsPreflight are set, cors takes precedence.
    let corsPreflight = props.corsPreflight;
    if (cors === undefined || cors === true) {
      corsPreflight = {
        allowHeaders: ['*'],
        allowMethods: [
          apig.HttpMethod.DELETE,
          apig.HttpMethod.GET,
          apig.HttpMethod.HEAD,
          apig.HttpMethod.OPTIONS,
          apig.HttpMethod.PATCH,
          apig.HttpMethod.POST,
          apig.HttpMethod.PUT,
        ],
        allowOrigins: ['*'],
      };
    }

    ////////////////////
    // Create Api
    ////////////////////

    super(scope, id, {
      ...props,
      corsPreflight,
    });

    // set API endpoint as stack output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: this.apiEndpoint,
    });

    ///////////////////////////
    // Configure access log
    ///////////////////////////

    // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
    //       need to define it at L1 construct level.
    if (accessLog !== false) {
      // create log group
      const logGroup = new logs.LogGroup(this, 'LogGroup');

      // get log format
      const logFormat = (accessLog === undefined || accessLog === true)
        ? '{ "requestId":"$context.requestId", "ip": "$context.identity.sourceIp", "caller":"$context.identity.caller", "user":"$context.identity.user","requestTime":"$context.requestTime", "httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath", "status":"$context.status","protocol":"$context.protocol", "responseLength":"$context.responseLength" }'
        : accessLog.format;

      // get L1 cfnStage construct
      if ( ! this.defaultStage.node.defaultChild) {
        throw new Error(`Fail to define the default stage for Http API.`);
      }

      // set access log settings
      const cfnStage = this.defaultStage.node.defaultChild as apig.CfnStage;
      cfnStage.accessLogSettings = {
        format: logFormat,
        destinationArn: logGroup.logGroupArn,
      };

      // set log group name as stack output
      new cdk.CfnOutput(this, "AccessLogGroupName", {
        value: logGroup.logGroupName,
      });
    }


    // Set defaults
    const defaultLambdaProps = props.defaultLambdaProps;
    const routes = props.routes;

    ///////////////////////////
    // Configure routes
    ///////////////////////////

    Object.keys(routes).forEach((routeName: string) => {
      let routeProps = routes[routeName];
      if (typeof routeProps === 'string') {
        routeProps = { handler: routeProps };
      }

      // Get path and method
      const routeNameParts = routeName.split(' ');
      if (routeNameParts.length !== 2) {
        throw new Error(`Invalid route ${routeName}`);
      }
      const method = routeNameParts[0].toUpperCase();
      const path = routeNameParts[1];
      if ( ! [ apig.HttpMethod.DELETE,
        apig.HttpMethod.GET,
        apig.HttpMethod.HEAD,
        apig.HttpMethod.OPTIONS,
        apig.HttpMethod.PATCH,
        apig.HttpMethod.POST,
        apig.HttpMethod.PUT,
      ].includes(method)) {
        throw new Error(`Invalid method defined for route ${routeName}`);
      }
      if (path.length === 0) {
        throw new Error(`Invalid path defined for route ${routeName}`);
      }

      // Get authorization type
      let authorizationType = routeProps.authorizationType || defaultAuthorizationType || 'NONE';
      authorizationType = authorizationType.toUpperCase();
      if ( ! [ 'NONE', 'AWS_IAM' ].includes(authorizationType)) {
        throw new Error(
          `sst.Api does not support ${authorizationType} authorization type. Only 'NONE' and 'AWS_IAM' types are currently supported.`
        );
      }

      // Get Lambda props
      const lambdaProps = { ...defaultLambdaProps, ...routeProps.lambdaProps };
      if ( ! lambdaProps.handler) {
        throw new Error(`No Lambda handler defined for route ${routeName}`);
      }

      // Create route
      const lambda = new Function(this, `Lambda_${method}_${path}`, lambdaProps);
      const route = new apig.HttpRoute(this, `Route_${method}_${path}`, {
        httpApi: this,
        routeKey: apig.HttpRouteKey.with(path, method),
        integration: new apigIntegrations.LambdaProxyIntegration({
          handler: lambda,
        }),
      });

      // Configure route authorization type
      if ( ! route.node.defaultChild) {
        throw new Error(`Fail to define the default route for route ${routeName}.`);
      }
      const cfnRoute = route.node.defaultChild as apig.CfnRoute;
      cfnRoute.authorizationType = authorizationType;

    });
  }
}
