import * as ssm from "aws-cdk-lib/aws-ssm";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Api, ApiProps } from "../Api.js";
import { FunctionDefinition } from "../Function.js";
import { SSTConstruct } from "../Construct.js";
import { App } from "../App.js";
import { Stack } from "../Stack.js";
import { Secret } from "../Secret.js";
import {
  FunctionBindingProps,
  getParameterPath,
} from "../util/functionBinding.js";
import { CustomResource } from "aws-cdk-lib";

export interface AuthProps {
  /**
   * The function that will handle authentication
   */
  authenticator: FunctionDefinition;
  customDomain?: ApiProps["customDomain"];
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

  private api: Api;
  private publicKey: Secret;
  private privateKey: Secret;

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

    this.id = id;
    const stack = Stack.of(scope) as Stack;
    this.authenticator = props.authenticator;

    this.api = new Api(this, id + "-api", {
      routes: {
        "ANY /{step}": {
          function: this.authenticator,
        },
        "ANY /": {
          function: this.authenticator,
        },
      },
      customDomain: props.customDomain,
    });

    this.publicKey = new Secret(this, id + "PublicKey");
    this.privateKey = new Secret(this, id + "PrivateKey");

    const fn = this.api.getFunction("ANY /{step}")!;
    fn.bind([this.publicKey, this.privateKey]);
    const app = this.node.root as App;
    fn.addEnvironment("AUTH_ID", id);
    fn.attachPermissions([
      new PolicyStatement({
        actions: ["ssm:GetParameters"],
        effect: Effect.ALLOW,
        resources: [
          `arn:${Stack.of(this).partition}:ssm:${app.region}:${
            app.account
          }:parameter${getParameterPath(this.publicKey, "value")}`,
          `arn:${Stack.of(this).partition}:ssm:${app.region}:${
            app.account
          }:parameter${getParameterPath(this.privateKey, "value")}`,
        ],
      }),
    ]);

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
        publicPath: getParameterPath(this.publicKey, "value"),
        privatePath: getParameterPath(this.privateKey, "value"),
      },
    });
    resource.node.addDependency(policy);
  }

  public get url() {
    return this.api.customDomainUrl || this.api.url;
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
    return {
      clientPackage: "future/auth",
      variables: {
        publicKey: {
          type: "secret_reference",
          secret: this.publicKey,
        },
        url: {
          type: "plain",
          value: this.url,
        },
      },
      permissions: {},
    };
  }
}
