import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Api } from "./Api.js";
import { FunctionDefinition } from "./Function";
import { SSTConstruct } from "./Construct.js";
import { Stack } from "./index.js";
import { App } from "./App.js";
import { FunctionBindingProps, getParameterPath } from "./util/functionBinding.js";
import { CustomResource } from "aws-cdk-lib";

export interface AuthProps {
  /**
   * Used to override the default id for the construct.
   */
  logicalId?: string;
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
export class Auth extends Construct implements SSTConstruct {
  public readonly id: string;
  private readonly authenticator: FunctionDefinition;
  private readonly apis = new Set<Api>();

  /** @internal */
  public static list = new Set<Auth>();

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, props.logicalId || id);
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

    this.id = id;
    const app = this.node.root as App;
    const stack = Stack.of(scope) as Stack;
    const privatePath = `${getParameterPath(this)}/privateKey`;
    const publicPath = `${getParameterPath(this)}/publicKey`;
    this.authenticator = props.authenticator;

    // Create execution policy
    const policyStatement = new PolicyStatement({
      actions: [
        "ssm:GetParameter",
        "ssm:PutParameter",
        "ssm:DeleteParameter",
      ],
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

  /** @internal */
  public getConstructMetadata() {
    return {
      type: "Auth" as const,
      data: {},
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    const app = this.node.root as App;
    return {
      clientPackage: "auth",
      variables: {
        publicKey: {
          environment: "1",
          // SSM parameters will be created by the custom resource
          parameter: undefined,
        },
      },
      permissions: {
        "ssm:GetParameters": [
          `arn:aws:ssm:${app.region}:${app.account}:parameter${getParameterPath(this)}/publicKey`
        ],
      },
    };
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
    const app = this.node.root as App;

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

      // Auth construct has two types of Function bindinds:
      // - Api routes: bindings defined in `getFunctionBinding()`
      //     ie. calling `use.([auth])` will grant functions access to the public key
      // - Auth authenticator: binds manually. Need to grant access to the prefix and private key
      const fn = props.api.getFunction(path)!;
      fn.addEnvironment(`SST_AUTH_${this.node.id}_PREFIX`, prefix);
      fn.attachPermissions([new PolicyStatement({
        actions: ["ssm:GetParameters"],
        effect: Effect.ALLOW,
        resources: [
          `arn:aws:ssm:${app.region}:${app.account}:parameter${getParameterPath(this)}/publicKey`,
          `arn:aws:ssm:${app.region}:${app.account}:parameter${getParameterPath(this)}/privateKey`,
        ]
      })]);
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
        fn.use([this]);
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
