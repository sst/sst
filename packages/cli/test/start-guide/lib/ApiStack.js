import * as cdk from "@aws-cdk/core";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { HttpApi, HttpRoute, HttpRouteKey } from "@aws-cdk/aws-apigatewayv2";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";

import { Stack, Function } from "@serverless-stack/resources";

export default class ApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { routes = [], cors, environment, policyStatements = [] } = props;

    // Create API
    let corsPreflight;
    if (cors) {
      corsPreflight = {
        allowHeaders: ['*'],
        allowMethods: ['*'],
        allowOrigins: ['*'],
      };
    }
    const api = new HttpApi(this, "Api", {
      corsPreflight,
      //      defaultDomainMapping: {
      //        domainName: domain,
      //      },
    });

    // Create routes
    const initialPolicy = policyStatements.map(statement => new PolicyStatement(statement));
    routes.forEach(([ path, method, srcPath, entry, handler, auth ]) => {
      const lambda = new Function(this, `Lambda_${method}_${path}`, {
        srcPath,
        entry,
        handler,
        environment,
        initialPolicy,
      });
      const route = new HttpRoute(this, `Route_${method}_${path}`, {
        httpApi: api,
        routeKey: HttpRouteKey.with(path, method),
        integration: new LambdaProxyIntegration({
          handler: lambda,
        }),
      });

      if (auth === 'aws_iam') {
        route.node.defaultChild.authorizationType = 'AWS_IAM';
      }
    });

    this.api = api;

    // Show API endpoint in output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.apiEndpoint,
    });
  }
}
