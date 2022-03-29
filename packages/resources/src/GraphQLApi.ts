import { HttpRouteIntegration } from "@aws-cdk/aws-apigatewayv2-alpha";
import { App } from "./App";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import { Api, ApiFunctionRouteProps, ApiProps } from "./Api";
import { Function as Fn, FunctionDefinition } from "./Function";
import { ApiPayloadFormatVersion } from ".";

export interface GraphQLApiProps extends Omit<ApiProps, "routes"> {
  /**
   * Path to graphql-codegen configuration file
   */
  codegen?: string;
  server: FunctionDefinition;
  rootPath?: string;
}

export class GraphQLApi extends Api {
  private readonly codegen?: string;
  private lambdaIntegration?: HttpRouteIntegration;
  private rootPath?: string;

  constructor(scope: Construct, id: string, props: GraphQLApiProps) {
    // Validate server
    if (!props.server) {
      throw new Error(`Missing "server" in the "${id}" GraphQLApi`);
    }

    if ("routes" in props) {
      throw new Error(
        `Please use the "server" option instead of the "routes" to configure the handler for the "${id}" GraphQLApi`
      );
    }

    /*
    if (props.codegen) {
      const app = App.of(scope) as App;
      if (!app.local) {
        const result = spawn.sync(
          "npx",
          ["graphql-codegen", "-c", props.codegen],
          {
            stdio: "inherit",
          }
        );
        if (result.status !== 0) {
          throw new Error(
            `Failed to generate the schema for the "${id}" GraphQLApi`
          );
        }
      }
    }
    */

    const rootPath = props.rootPath || "/";

    super(scope, id, {
      ...props,
      defaultPayloadFormatVersion:
        props.defaultPayloadFormatVersion || ApiPayloadFormatVersion.V1,
      routes: {
        [`GET ${rootPath}`]: props.server,
        [`POST ${rootPath}`]: props.server,
      },
    });
    this.rootPath = rootPath;
    this.codegen = props.codegen;
  }

  public get serverFunction(): Fn {
    const serverFn = this.getFunction(`GET ${this.rootPath}`);

    // This should never happen
    if (!serverFn) {
      throw new Error(
        `Failed to get "serverFunction" in the "${this.node.id}" GraphQLApi`
      );
    }

    return serverFn;
  }

  // Note: We want to create 1 Lambda handling both the GET and POST request.
  //       This design is based on this discussion on GitHub
  //       https://github.com/serverless-stack/serverless-stack/issues/601
  // Also Note: We cannot use the "ANY /" route because if authorization
  //            were provided, the OPTIONS route will be protected. This
  //            causes CORS to fail.
  // Solution: We will override the createFunctionIntegration() function, and
  //           it will re-use the same Route Integration for all routes.
  protected createFunctionIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiFunctionRouteProps,
    postfixName: string
  ): HttpRouteIntegration {
    if (!this.lambdaIntegration) {
      this.lambdaIntegration = super.createFunctionIntegration(
        scope,
        routeKey,
        routeProps,
        postfixName
      );
    }

    return this.lambdaIntegration;
  }

  public getConstructMetadata() {
    const parent = super.getConstructMetadata();
    return {
      ...parent,
      data: {
        ...parent.data,
        graphql: true as const,
        codegen: this.codegen,
      },
    };
  }
}
