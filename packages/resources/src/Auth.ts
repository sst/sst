import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Api } from "./Api.js";
import { Secret } from "./Config.js";
import { FunctionDefinition } from "./Function";
import { Stack } from "./index.js";
import { App } from "./App.js";
import { CustomResource } from "aws-cdk-lib";
import { FunctionConfig } from "@serverless-stack/core";

export interface AuthProps {
  /**
   * The function that will handle authentication
   */
  authenticator: FunctionDefinition;
}

export interface ApiAttachmentProps {
  /**
   * The API to attach auth routes to
   *
   * @example
   * ```js
   * const api = new Api(stack, "Api", {});
   * const auth = new Auth(stack, "Auth", {
   *   authenticator: "functions/authenticator.handler"
   * })
   * auth.attach({
   *   api
   * })
   * ```
   */
  api: Api;

  /**
   * Optionally specify the prefix to mount authentication routes
   *
   * @default "/auth"
   *
   * @example
   * ```js
   * const api = new Api(stack, "Api", {});
   * const auth = new Auth(stack, "Auth", {
   *   authenticator: "functions/authenticator.handler"
   * })
   * auth.attach({
   *   api,
   *   prefix: "/custom/prefix"
   * })
   * ```
   */
  prefix?: string;
}

/**
 * SST Auth is a lightweight authentication solution for your applications. With a simple set of configuration you can deploy a function attached to your API that can handle various authentication flows.  *
 * @example
 * ```
 * import { Auth } from "@serverless-stack/resources"
 *
 * new Auth(stack, "auth", {
 *   authenticator: "functions/authenticator.handler"
 * })
 */
export class Auth extends Construct {
  /**
   * Secret that contains the public JWT signing key
   */
  public readonly SST_AUTH_PUBLIC: Secret;
  /**
   * Secret that contains the private JWT signing key
   */
  public readonly SST_AUTH_PRIVATE: Secret;
  private readonly authenticator: FunctionDefinition;

  private readonly apis = new Set<Api>();

  /** @internal */
  public static list = new Set<Auth>();

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);
    if (
      !props.authenticator ||
      "defaults" in props ||
      "login" in props ||
      "triggers" in props ||
      "identityPoolFederation" in props ||
      "cdk" in props
    ) {
      throw new Error(
        `It looks like you may be passing in Cognito props to the Auth construct. The Auth construct was renamed to Cognito in version 1.10.0`
      );
    }

    Auth.list.add(this);

    const app = this.node.root as App;
    const stack = Stack.of(scope) as Stack;
    this.SST_AUTH_PUBLIC = new Secret(scope, "SST_AUTH_PUBLIC");
    this.SST_AUTH_PRIVATE = new Secret(scope, "SST_AUTH_PRIVATE");
    const privatePath = FunctionConfig.buildSsmNameForSecret(
      app.name,
      app.stage,
      this.SST_AUTH_PRIVATE.name
    );
    const publicPath = FunctionConfig.buildSsmNameForSecret(
      app.name,
      app.stage,
      this.SST_AUTH_PUBLIC.name
    );
    this.authenticator = props.authenticator;

    // Create execution policy
    const policyStatement = new PolicyStatement({
      actions: ["ssm:PutParameter", "ssm:DeleteParameter"],
      effect: Effect.ALLOW,
      resources: ["*"]
    });
    stack.customResourceHandler.addToRolePolicy(policyStatement);

    new CustomResource(this, "StackMetadata", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::AuthKeys",
      properties: {
        publicPath,
        privatePath
      }
    });
  }

  /**
   * Attaches auth construct to an API
   *
   * @example
   * ```js
   * const api = new Api(stack, "Api", {});
   * const auth = new Auth(stack, "Auth", {
   *   authenticator: "functions/authenticator.handler"
   * })
   * auth.attach({
   *   api
   * })
   * ```
   */
  public attach(scope: Construct, props: ApiAttachmentProps) {
    if (this.apis.has(props.api))
      throw new Error(
        "This auth construct has already been attached to this API"
      );
    this.apis.add(props.api);
    const prefix = props.prefix || "/auth";
    for (let path of [`ANY ${prefix}/{proxy+}`, `GET ${prefix}`]) {
      props.api.addRoutes(scope, {
        [path]: {
          type: "function",
          function: this.authenticator
        }
      });
      props.api.getFunction(path)!.addConfig([this.SST_AUTH_PRIVATE]);
      props.api.getFunction(path)!.addEnvironment("SST_AUTH_PREFIX", prefix);
    }
  }

  /**
   * @internal
   */
  public injectConfig() {
    for (const api of this.apis) {
      for (const route of api.routes) {
        const fn = api.getFunction(route);
        if (!fn) continue;
        fn.addConfig([this.SST_AUTH_PUBLIC]);
      }
    }
  }
  /**
   * @internal
   */
  public static injectConfig() {
    for (const auth of Auth.list) {
      auth.injectConfig();
    }
  }
}
