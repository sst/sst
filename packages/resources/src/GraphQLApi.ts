import { HttpRouteIntegration } from "@aws-cdk/aws-apigatewayv2-alpha";
import { App } from "./App.js";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import { Api, ApiFunctionRouteProps, ApiProps } from "./Api.js";
import { Function as Fn, FunctionDefinition } from "./Function.js";

export interface GraphQLApiProps extends Omit<ApiProps, "routes"> {
  /**
   * Path to graphql-codegen configuration file
   *
   * @example
   * ```js
   * new GraphQLApi(stack, "api", {
   *   codegen: "./graphql/codegen.yml"
   * })
   * ```
   */
  codegen?: string;
  /**
   * Path to function that will be invoked to resolve GraphQL queries.
   *
   * @example
   * ```js
   * new GraphQLApi(stack, "api", {
   *   codegen: "./graphql/codegen.yml"
   * })
   * ```
   */
  server: FunctionDefinition;
  rootPath?: string;
}

/**
 * The `GraphQLApi` construct is a higher level CDK construct that makes it easy to create GraphQL servers with AWS Lambda. It provides a simple way to define the GraphQL handler route in your API. And allows you to configure the specific Lambda function if necessary. It also allows you to configure authorization, custom domains, etc.
 *
 * The `GraphQLApi` construct internally extends the [`Api`](Api) construct.
 *
 * @example
 * ### Using the minimal config
 *
 * ```js
 * import { GraphQLApi } from "@serverless-stack/resources";
 *
 * new GraphQLApi(stack, "Api", {
 *   server: "src/graphql.handler",
 * });
 * ```
 */
export class GraphQLApi extends Api {
  private readonly codegen?: string;
  private lambdaIntegration?: HttpRouteIntegration;
  private rootPath?: string;

  constructor(scope: Construct, id: string, props: GraphQLApiProps) {
    if ("routes" in props || !props.server) {
      throw new Error(
        `Please use the "server" option instead of the "routes" to configure the handler for the "${id}" GraphQLApi`
      );
    }

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

    const rootPath = props.rootPath || "/";

    super(scope, id, {
      ...props,
      routes: {
        [`GET ${rootPath}`]: { function: props.server },
        [`POST ${rootPath}`]: { function: props.server },
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
  //       https://github.com/serverless-stack/sst/issues/601
  // Also Note: We cannot use the "ANY /" route because if authorization
  //            were provided, the OPTIONS route will be protected. This
  //            causes CORS to fail.
  // Solution: We will override the createFunctionIntegration() function, and
  //           it will re-use the same Route Integration for all routes.
  protected createFunctionIntegration(
    scope: Construct,
    routeKey: string,
    routeProps: ApiFunctionRouteProps<string>,
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
