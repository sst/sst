import { Construct } from "constructs";
import { Api } from "./Api.js";
import { Secret } from "./Config.js";
import { FunctionDefinition } from "./Function";

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
  private readonly SST_AUTH_TOKEN: Secret;
  private readonly authenticator: FunctionDefinition;
  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);
    this.SST_AUTH_TOKEN = new Secret(scope, "SST_AUTH_TOKEN");
    this.authenticator = props.authenticator;
  }

  public attach(scope: Construct, props: ApiAttachmentProps) {
    const prefix = props.prefix || "/auth";
    const path = `ANY ${prefix}/{proxy+}`;
    props.api.addRoutes(scope, {
      [path]: {
        type: "function",
        function: this.authenticator,
      },
    });
    props.api.getFunction(path)!.addConfig([this.SST_AUTH_TOKEN]);
  }
}
