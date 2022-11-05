import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import {
  getFunctionRef,
  SSTConstruct,
  isCDKConstruct,
  isConstruct
} from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionDefinition
} from "./Function.js";
import {
  Permissions,
  attachPermissionsToRole,
  attachPermissionsToPolicy
} from "./util/permission.js";

const CognitoUserPoolTriggerOperationMapping = {
  createAuthChallenge: cognito.UserPoolOperation.CREATE_AUTH_CHALLENGE,
  customEmailSender: cognito.UserPoolOperation.CUSTOM_EMAIL_SENDER,
  customMessage: cognito.UserPoolOperation.CUSTOM_MESSAGE,
  customSmsSender: cognito.UserPoolOperation.CUSTOM_SMS_SENDER,
  defineAuthChallenge: cognito.UserPoolOperation.DEFINE_AUTH_CHALLENGE,
  postAuthentication: cognito.UserPoolOperation.POST_AUTHENTICATION,
  postConfirmation: cognito.UserPoolOperation.POST_CONFIRMATION,
  preAuthentication: cognito.UserPoolOperation.PRE_AUTHENTICATION,
  preSignUp: cognito.UserPoolOperation.PRE_SIGN_UP,
  preTokenGeneration: cognito.UserPoolOperation.PRE_TOKEN_GENERATION,
  userMigration: cognito.UserPoolOperation.USER_MIGRATION,
  verifyAuthChallengeResponse:
    cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE
};

export interface CognitoUserPoolTriggers {
  createAuthChallenge?: FunctionDefinition;
  customEmailSender?: FunctionDefinition;
  customMessage?: FunctionDefinition;
  customSmsSender?: FunctionDefinition;
  defineAuthChallenge?: FunctionDefinition;
  postAuthentication?: FunctionDefinition;
  postConfirmation?: FunctionDefinition;
  preAuthentication?: FunctionDefinition;
  preSignUp?: FunctionDefinition;
  preTokenGeneration?: FunctionDefinition;
  userMigration?: FunctionDefinition;
  verifyAuthChallengeResponse?: FunctionDefinition;
}

export interface CognitoAuth0Props {
  domain: string;
  clientId: string;
}

export interface CognitoAmazonProps {
  appId: string;
}

export interface CognitoAppleProps {
  servicesId: string;
}

export interface CognitoFacebookProps {
  appId: string;
}

export interface CognitoGoogleProps {
  clientId: string;
}

export interface CognitoTwitterProps {
  consumerKey: string;
  consumerSecret: string;
}

export interface CognitoCdkCfnIdentityPoolProps
  extends Omit<cognito.CfnIdentityPoolProps, "allowUnauthenticatedIdentities"> {
  allowUnauthenticatedIdentities?: boolean;
}

export interface CognitoIdentityPoolFederationProps {
  auth0?: CognitoAuth0Props;
  amazon?: CognitoAmazonProps;
  apple?: CognitoAppleProps;
  facebook?: CognitoFacebookProps;
  google?: CognitoGoogleProps;
  twitter?: CognitoTwitterProps;
  cdk?: {
    cfnIdentityPool?: CognitoCdkCfnIdentityPoolProps;
  };
}

export interface CognitoProps {
  defaults?: {
    /**
     * The default function props to be applied to all the triggers in the UserPool. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     *
     * ```js
     * new Cognito(stack, "Auth", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *       environment: { topicName: topic.topicName },
     *       permissions: [topic],
     *     }
     *   },
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * Configure the different ways a user can sign in to our application for our User Pool. For example, you might want a user to be able to sign in with their email or username. Or with their phone number.
   *
   * :::caution
   * You cannot change the login property once the User Pool has been created.
   * :::
   *
   * @default `["username"]`
   */
  login?: ("email" | "phone" | "username" | "preferredUsername")[];
  /**
   * Configure triggers for this User Pool
   * @default No triggers
   *
   * @example
   *
   * ```js
   * new Cognito(stack, "Auth", {
   *   triggers: {
   *     preAuthentication: "src/preAuthentication.main",
   *     postAuthentication: "src/postAuthentication.main",
   *   },
   * });
   * ```
   */
  triggers?: CognitoUserPoolTriggers;
  /**
   * Configure the Cognito Identity Pool and its authentication providers.
   * @default Identity Pool created with the User Pool as the authentication provider
   */
  identityPoolFederation?: boolean | CognitoIdentityPoolFederationProps;
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * This allows you to override the default settings this construct uses internally to create the User Pool.
     */
    userPool?: cognito.UserPoolProps | cognito.IUserPool;
    /**
     * This allows you to override the default settings this construct uses internally to create the User Pool client.
     */
    userPoolClient?: cognito.UserPoolClientOptions | cognito.IUserPoolClient;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Cognito` construct is a higher level CDK construct that makes it easy to configure a Cognito User Pool and Cognito Identity Pool.
 *
 * @example
 *
 * ```js
 * import { Cognito } from "@serverless-stack/resources";
 *
 * new Cognito(stack, "Cognito");
 * ```
 */
export class Cognito extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly cdk: {
    userPool: cognito.IUserPool;
    userPoolClient: cognito.IUserPoolClient;
    cfnIdentityPool?: cognito.CfnIdentityPool;
    authRole: iam.Role;
    unauthRole: iam.Role;
  };
  private functions: { [key: string]: Fn } = {};
  private props: CognitoProps;

  constructor(scope: Construct, id: string, props?: CognitoProps) {
    super(scope, props?.cdk?.id || id);

    this.id = id;
    this.props = props || {};
    this.cdk = {} as any;

    this.createUserPool();
    this.createUserPoolClient();
    this.addTriggers();
    this.createIdentityPool();
  }

  /**
   * The id of the internally created Cognito User Pool.
   */
  public get userPoolId(): string {
    return this.cdk.userPool.userPoolId;
  }

  /**
   * The ARN of the internally created Cognito User Pool.
   */
  public get userPoolArn(): string {
    return this.cdk.userPool.userPoolArn;
  }

  /**
   * The id of the internally created Cognito User Pool client.
   */
  public get userPoolClientId(): string {
    return this.cdk.userPoolClient.userPoolClientId;
  }

  /**
   * The id of the internally created `IdentityPool` instance.
   */
  public get cognitoIdentityPoolId(): string | undefined {
    return this.cdk.cfnIdentityPool?.ref;
  }

  /**
   * Attaches the given list of permissions to the authenticated users. This allows the authenticated users to access other AWS resources.
   *
   * @example
   * ```js
   * auth.attachPermissionsForAuthUsers(stack, ["s3"]);
   * ```
   */
  public attachPermissionsForAuthUsers(
    scope: Construct,
    permissions: Permissions
  ): void;
  /**
   * @deprecated You are now required to pass in a scope as the first argument.
   *
   * ```js
   * // Change
   * auth.attachPermissionsForAuthUsers(["s3"]);
   * // to
   * auth.attachPermissionsForAuthUsers(auth, ["s3"]);
   * ```
   */
  public attachPermissionsForAuthUsers(permissions: Permissions): void;
  public attachPermissionsForAuthUsers(arg1: any, arg2?: any): void {
    return this.attachPermissionsForUsers(this.cdk.authRole, arg1, arg2);
  }

  /**
   * Attaches the given list of permissions to the authenticated users. This allows the authenticated users to access other AWS resources.
   *
   * @example
   * ```js
   * auth.attachPermissionsForUnauthUsers(stack, ["s3"]);
   * ```
   */
  public attachPermissionsForUnauthUsers(
    scope: Construct,
    permissions: Permissions
  ): void;
  /**
   * @deprecated You are now required to pass in a scope as the first argument.
   * ```js
   * // Change
   * auth.attachPermissionsForUnauthUsers(["s3"]);
   * // to
   * auth.attachPermissionsForUnauthUsers(auth, ["s3"]);
   * ```
   */
  public attachPermissionsForUnauthUsers(permissions: Permissions): void;
  public attachPermissionsForUnauthUsers(arg1: any, arg2?: any): void {
    return this.attachPermissionsForUsers(this.cdk.unauthRole, arg1, arg2);
  }

  public bindForTriggers(constructs: SSTConstruct[]): void {
    Object.values(this.functions).forEach(fn =>
      fn.bind(constructs)
    );
  }

  public bindForTrigger(
    triggerKey: keyof CognitoUserPoolTriggers,
    constructs: SSTConstruct[]
  ): void {
    const fn = this.getFunction(triggerKey);
    if (!fn) {
      throw new Error(
        `Failed to bind resources. Trigger "${triggerKey}" does not exist.`
      );
    }

    fn.bind(constructs);
  }

  public attachPermissionsForTriggers(permissions: Permissions): void {
    Object.values(this.functions).forEach(fn =>
      fn.attachPermissions(permissions)
    );
  }

  public attachPermissionsForTrigger(
    triggerKey: keyof CognitoUserPoolTriggers,
    permissions: Permissions
  ): void {
    const fn = this.getFunction(triggerKey);
    if (!fn) {
      throw new Error(
        `Failed to attach permissions. Trigger "${triggerKey}" does not exist.`
      );
    }

    fn.attachPermissions(permissions);
  }

  public getFunction(
    triggerKey: keyof CognitoUserPoolTriggers
  ): Fn | undefined {
    return this.functions[triggerKey];
  }

  public getConstructMetadata() {
    return {
      type: "Cognito" as const,
      data: {
        identityPoolId: this.cdk.cfnIdentityPool?.ref,
        userPoolId: this.cdk.userPool.userPoolId,
        triggers: Object.entries(this.functions).map(([name, fun]) => ({
          name,
          fn: getFunctionRef(fun)
        }))
      }
    };
  }

  /** @internal */
  public getFunctionBinding() {
    return undefined;
  }

  private attachPermissionsForUsers(
    role: iam.Role,
    arg1: any,
    arg2?: any
  ): void {
    let scope: Construct;
    let permissions: Permissions;
    if (arg2) {
      scope = arg1;
      permissions = arg2;
    } else {
      scope = this;
      permissions = arg1;
    }

    // If the scope is within the same stack as the `Auth` construct, attach the permissions
    // directly to the auth role.
    if (Stack.of(scope) === Stack.of(this)) {
      attachPermissionsToRole(role, permissions);
    }
    // If the scope is within a different stack, we need to create a new role and attach the permissions to that role.
    else {
      const policyId =
        role === this.cdk.authRole
          ? `Auth-${this.node.id}-${scope.node.id}-AuthRole`
          : `Auth-${this.node.id}-${scope.node.id}-UnauthRole`;
      let policy = scope.node.tryFindChild(policyId) as iam.Policy;
      if (!policy) {
        policy = new iam.Policy(scope, policyId);
      }
      role.attachInlinePolicy(policy);

      attachPermissionsToPolicy(policy, permissions);
    }
  }

  private createUserPool(): void {
    const { login, cdk } = this.props;

    const app = this.node.root as App;

    if (isCDKConstruct(cdk?.userPool)) {
      this.cdk.userPool = cdk?.userPool as cognito.UserPool;
    } else {
      const cognitoUserPoolProps = (cdk?.userPool ||
        {}) as cognito.UserPoolProps;
      // validate `lambdaTriggers` is not specified
      if (cognitoUserPoolProps.lambdaTriggers) {
        throw new Error(
          `Cannot configure the "cdk.userPool.lambdaTriggers" in the Cognito construct. Use the "triggers" instead.`
        );
      }
      // validate `cdk.userPoolClient` is not imported
      if (isCDKConstruct(cdk?.userPoolClient)) {
        throw new Error(
          `Cannot import the "userPoolClient" when the "userPool" is not imported.`
        );
      }

      this.cdk.userPool = new cognito.UserPool(this, "UserPool", {
        userPoolName: app.logicalPrefixedName(this.node.id),
        selfSignUpEnabled: true,
        signInCaseSensitive: false,
        signInAliases: this.buildSignInAliases(login),
        ...cognitoUserPoolProps
      });
    }
  }

  private createUserPoolClient(): void {
    const { cdk } = this.props;

    if (isCDKConstruct(cdk?.userPoolClient)) {
      this.cdk.userPoolClient = cdk?.userPoolClient as cognito.UserPoolClient;
    } else {
      const clientProps = (cdk?.userPoolClient ||
        {}) as cognito.UserPoolClientOptions;
      this.cdk.userPoolClient = new cognito.UserPoolClient(
        this,
        "UserPoolClient",
        {
          userPool: this.cdk.userPool,
          ...clientProps
        }
      );
    }
  }

  private createIdentityPool(): void {
    const { identityPoolFederation } = this.props;

    if (identityPoolFederation === false) {
      return;
    }

    const id = this.node.id;
    const app = this.node.root as App;
    const cognitoIdentityProviders = [];
    const openIdConnectProviderArns = [];
    const supportedLoginProviders = {} as { [key: string]: string };

    ////////////////////
    // Handle Cognito Identity Providers (ie. User Pool)
    ////////////////////
    const urlSuffix = Stack.of(this).urlSuffix;
    cognitoIdentityProviders.push({
      providerName: `cognito-idp.${app.region}.${urlSuffix}/${this.cdk.userPool.userPoolId}`,
      clientId: this.cdk.userPoolClient.userPoolClientId
    });

    if (typeof identityPoolFederation === "object") {
      const {
        auth0,
        amazon,
        apple,
        facebook,
        google,
        twitter
      } = identityPoolFederation;

      ////////////////////
      // Handle OpenId Connect Providers (ie. Cognito)
      ////////////////////
      if (auth0) {
        if (!auth0.domain) {
          throw new Error(
            `Auth0Domain: No Auth0 domain defined for the "${id}" Auth`
          );
        }
        if (!auth0.clientId) {
          throw new Error(
            `Auth0ClientId: No Auth0 clientId defined for the "${id}" Auth`
          );
        }
        const provider = new iam.OpenIdConnectProvider(this, "Auth0Provider", {
          url: auth0.domain.startsWith("https://")
            ? auth0.domain
            : `https://${auth0.domain}`,
          clientIds: [auth0.clientId]
        });
        openIdConnectProviderArns.push(provider.openIdConnectProviderArn);
      }

      ////////////////////
      // Handle Social Identity Providers
      ////////////////////
      if (amazon) {
        if (!amazon.appId) {
          throw new Error(
            `AmazonAppId: No Amazon appId defined for the "${id}" Auth`
          );
        }
        supportedLoginProviders["www.amazon.com"] = amazon.appId;
      }
      if (facebook) {
        if (!facebook.appId) {
          throw new Error(
            `FacebookAppId: No Facebook appId defined for the "${id}" Auth`
          );
        }
        supportedLoginProviders["graph.facebook.com"] = facebook.appId;
      }
      if (google) {
        if (!google.clientId) {
          throw new Error(
            `GoogleClientId: No Google appId defined for the "${id}" Auth`
          );
        }
        supportedLoginProviders["accounts.google.com"] = google.clientId;
      }
      if (twitter) {
        if (!twitter.consumerKey) {
          throw new Error(
            `TwitterConsumerKey: No Twitter consumer key defined for the "${id}" Auth`
          );
        }
        if (!twitter.consumerSecret) {
          throw new Error(
            `TwitterConsumerSecret: No Twitter consumer secret defined for the "${id}" Auth`
          );
        }
        supportedLoginProviders[
          "api.twitter.com"
        ] = `${twitter.consumerKey};${twitter.consumerSecret}`;
      }
      if (apple) {
        if (!apple.servicesId) {
          throw new Error(
            `AppleServicesId: No Apple servicesId defined for the "${id}" Auth`
          );
        }
        supportedLoginProviders["appleid.apple.com"] = apple.servicesId;
      }
    }

    // Create Cognito Identity Pool
    const identityPoolProps =
      typeof identityPoolFederation === "object"
        ? identityPoolFederation.cdk?.cfnIdentityPool || {}
        : {};
    this.cdk.cfnIdentityPool = new cognito.CfnIdentityPool(
      this,
      "IdentityPool",
      {
        identityPoolName: app.logicalPrefixedName(id),
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders,
        supportedLoginProviders,
        openIdConnectProviderArns,
        ...identityPoolProps
      }
    );
    this.cdk.authRole = this.createAuthRole(this.cdk.cfnIdentityPool);
    this.cdk.unauthRole = this.createUnauthRole(this.cdk.cfnIdentityPool);

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.cdk.cfnIdentityPool.ref,
        roles: {
          authenticated: this.cdk.authRole.roleArn,
          unauthenticated: this.cdk.unauthRole.roleArn
        }
      }
    );
  }

  private addTriggers(): void {
    const { triggers, defaults } = this.props;

    if (!triggers || Object.keys(triggers).length === 0) {
      return;
    }

    // Validate cognito user pool is not imported
    // ie. imported IUserPool does not have the "addTrigger" function
    if (!(this.cdk.userPool as cognito.UserPool).addTrigger) {
      throw new Error(`Cannot add triggers when the "userPool" is imported.`);
    }

    Object.entries(triggers).forEach(([triggerKey, triggerValue]) =>
      this.addTrigger(
        this,
        triggerKey as keyof CognitoUserPoolTriggers,
        triggerValue,
        defaults?.function
      )
    );
  }

  private addTrigger(
    scope: Construct,
    triggerKey: keyof CognitoUserPoolTriggers,
    triggerValue: FunctionDefinition,
    functionProps?: FunctionProps
  ): Fn {
    // Validate cognito user pool is defined
    if (!this.cdk.userPool) {
      throw new Error(
        `Triggers cannot be added. No Cognito UserPool defined for the Cognito construct.`
      );
    }

    // Create Function
    const lambda = Fn.fromDefinition(
      scope,
      triggerKey,
      triggerValue,
      functionProps,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the triggers using FunctionProps, so the Cognito construct can apply the "defaults.function" to them.`
    );

    // Create trigger
    const operation = CognitoUserPoolTriggerOperationMapping[triggerKey];
    (this.cdk.userPool as cognito.UserPool).addTrigger(operation, lambda);

    // Store function
    this.functions[triggerKey] = lambda;

    return lambda;
  }

  private createAuthRole(identityPool: cognito.CfnIdentityPool): iam.Role {
    const role = new iam.Role(this, "IdentityPoolAuthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated"
          }
        },
        "sts:AssumeRoleWithWebIdentity"
      )
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*"
        ],
        resources: ["*"]
      })
    );

    return role;
  }

  private createUnauthRole(identityPool: cognito.CfnIdentityPool): iam.Role {
    const role = new iam.Role(this, "IdentityPoolUnauthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated"
          }
        },
        "sts:AssumeRoleWithWebIdentity"
      )
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
        resources: ["*"]
      })
    );

    return role;
  }

  private buildSignInAliases(
    login?: ("email" | "phone" | "username" | "preferredUsername")[]
  ): cognito.SignInAliases | undefined {
    if (!login) {
      return;
    }

    return {
      email: login.includes("email"),
      phone: login.includes("phone"),
      username: login.includes("username"),
      preferredUsername: login.includes("preferredUsername")
    };
  }
}
