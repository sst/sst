import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Api } from "./Api.js";
import { Secret } from "./Config.js";
import { FunctionDefinition } from "./Function";
import { Stack } from "./index.js";
import { App } from "./App.js";
import { CustomResource } from "aws-cdk-lib";

export interface AuthProps {
  /**
   * The function that will handle authentication
   */
  authenticator: FunctionDefinition;
}

export interface ApiAttachmentProps {
  /**
   * The API to attach auth routes to
   */
  api: Api;

  /**
   * Optionally specify the prefix to mount authentication routes
   *
   * @default "/auth"
   */
  prefix?: string;
}

/**
 * SST Auth is a lightweight authentication solution for your applications. With a simple set of configuration you can deploy a function attached to your API that can handle various authentication flows.  *
 * @example
 * ```ts
 * import { Auth } from "@serverless-stack/resources"
 *
 * new Auth(stack, "auth", {
 *   api: myApi,
 *   function: "functions/auth.handler",
 *   prefix: "/auth" // optional
 * })
 */
export class Auth extends Construct {
  private readonly SST_AUTH_PUBLIC: Secret;
  private readonly SST_AUTH_PRIVATE: Secret;
  private readonly authenticator: FunctionDefinition;

  private readonly apis = new Set<Api>();

  /** @internal */
  public static list = new Set<Auth>();

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);
    Auth.list.add(this);
    this.SST_AUTH_PUBLIC = new Secret(scope, "SST_AUTH_PUBLIC");
    this.SST_AUTH_PRIVATE = new Secret(scope, "SST_AUTH_PRIVATE");
    this.authenticator = props.authenticator;

    const app = this.node.root as App;
    const stack = Stack.of(scope) as Stack;
    // Create execution policy
    const policyStatement = new PolicyStatement();
    policyStatement.addResources(
      `arn:aws:s3:::${app.bootstrapAssets.bucketName}/*`
    );
    policyStatement.addActions("s3:PutObject", "s3:DeleteObject");
    stack.customResourceHandler.addToRolePolicy(policyStatement);

    new CustomResource(this, "StackMetadata", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::AuthKeys",
      properties: {
        App: app.name,
        Stage: stack.stage,
        Stack: stack.stackName,
        BootstrapBucketName: app.bootstrapAssets.bucketName!,
      },
    });
  }

  public attach(scope: Construct, props: ApiAttachmentProps) {
    if (this.apis.has(props.api))
      throw new Error(
        "This auth construct has already been attached to this API"
      );
    this.apis.add(props.api);
    const prefix = props.prefix || "/auth";
    const path = `ANY ${prefix}/{proxy+}`;
    props.api.addRoutes(scope, {
      [path]: {
        type: "function",
        function: this.authenticator,
      },
    });
    props.api.getFunction(path)!.addConfig([this.SST_AUTH_PRIVATE]);
  }

  /** @internal */
  public injectConfig() {
    for (const api of this.apis) {
      for (const route of api.routes) {
        const fn = api.getFunction(route);
        if (!fn) continue;
        fn.addConfig([this.SST_AUTH_PUBLIC]);
      }
    }
  }
  public static injectConfig() {
    for (const auth of Auth.list) {
      auth.injectConfig();
    }
  }
}
