import * as ssm from "aws-cdk-lib/aws-ssm";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Api } from "./Api.js";
import { FunctionDefinition } from "./Function.js";
import { SSTConstruct } from "./Construct.js";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Secret } from "./Secret.js";
import {
  FunctionBindingProps,
  getEnvironmentKey,
  getParameterPath,
  placeholderSecretValue,
} from "./util/functionBinding.js";
import { CustomResource } from "aws-cdk-lib";

const PUBLIC_KEY_PROP = "publicKey";
const PRIVATE_KEY_PROP = "privateKey";
const PREFIX_PROP = "prefix";

export interface AuthProps {
  /**
   * The function that will handle authentication
   */
  authenticator: FunctionDefinition;
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
  };
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
   * auth.attach(stack, {
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
   * auth.attach(stack, {
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
    super(scope, props.cdk?.id || id);
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
    const stack = Stack.of(scope) as Stack;
    this.authenticator = props.authenticator;

    const policy = new Policy(this, "CloudFrontInvalidatorPolicy", {
      statements: [
        new PolicyStatement({
          actions: [
            "ssm:GetParameter",
            "ssm:PutParameter",
            "ssm:DeleteParameter",
          ],
          resources: [
            `arn:${stack.partition}:ssm:${stack.region}:${stack.account}:parameter/*`,
          ],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);

    const resource = new CustomResource(this, "StackMetadata", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::AuthKeys",
      properties: {
        publicPath: getParameterPath(this, PUBLIC_KEY_PROP),
        privatePath: getParameterPath(this, PRIVATE_KEY_PROP),
      },
    });
    resource.node.addDependency(policy);
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
          type: "secret",
        },
        // Example of referencing a secret
        //publicKey2: {
        //  type: "secret_reference",
        //  secret: this.publicKey2,
        //},
      },
      permissions: {
        "ssm:GetParameters": [
          `arn:${Stack.of(this).partition}:ssm:${app.region}:${
            app.account
          }:parameter${getParameterPath(this, PUBLIC_KEY_PROP)}`,
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
   * auth.attach(stack, {
   *   api
   * })
   * ```
   */
  public attach(scope: Construct, props: ApiAttachmentProps) {
    const app = this.node.root as App;

    // Validate: one Auth can only be attached to one Api
    if (this.apis.has(props.api)) {
      throw new Error(
        "This Auth construct has already been attached to this Api construct."
      );
    }

    // Validate: one Api can only have one Auth attached to it
    if (Array.from(Auth.list).some((auth) => auth.apis.has(props.api))) {
      throw new Error(
        "This Api construct already has an Auth construct attached."
      );
    }

    const prefix = props.prefix || "/auth";

    for (let path of [`ANY ${prefix}/{proxy+}`, `GET ${prefix}`]) {
      props.api.addRoutes(scope, {
        [path]: {
          type: "function",
          function: this.authenticator,
          authorizer: "none",
        },
      });

      // Auth construct has two types of Function bindinds:
      // - Api routes: bindings defined in `getFunctionBinding()`
      //     ie. calling `bind([auth])` will grant functions access to the public key
      // - Auth authenticator: binds manually. Need to grant access to the prefix and private key
      const fn = props.api.getFunction(path)!;
      fn.addEnvironment(getEnvironmentKey(this, PREFIX_PROP), prefix);
      fn.addEnvironment(
        getEnvironmentKey(this, PUBLIC_KEY_PROP),
        placeholderSecretValue()
      );
      fn.addEnvironment(
        getEnvironmentKey(this, PRIVATE_KEY_PROP),
        placeholderSecretValue()
      );
      fn.attachPermissions([
        new PolicyStatement({
          actions: ["ssm:GetParameters"],
          effect: Effect.ALLOW,
          resources: [
            `arn:${Stack.of(this).partition}:ssm:${app.region}:${
              app.account
            }:parameter${getParameterPath(this, "*")}`,
          ],
        }),
      ]);
    }

    // Create a parameter for prefix
    // note: currently if an Auth construct is attached to multiple Apis,
    //       the prefix has to be the same for this to work.
    if (this.apis.size === 0) {
      new ssm.StringParameter(this, "prefix", {
        parameterName: getParameterPath(this, PREFIX_PROP),
        stringValue: prefix,
      });
    }

    this.apis.add(props.api);
  }

  /**
   * @internal
   */
  public injectConfig() {
    for (const api of this.apis) {
      for (const route of api.routes) {
        const fn = api.getFunction(route);
        if (!fn) continue;
        fn.bind([this]);
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
