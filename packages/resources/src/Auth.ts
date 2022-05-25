import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionDefinition,
} from "./Function.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";

const AuthUserPoolTriggerOperationMapping = {
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
    cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE,
};

export interface AuthUserPoolTriggers {
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

export interface AuthAuth0Props {
  domain: string;
  clientId: string;
}

export interface AuthAmazonProps {
  appId: string;
}

export interface AuthAppleProps {
  servicesId: string;
}

export interface AuthFacebookProps {
  appId: string;
}

export interface AuthGoogleProps {
  clientId: string;
}

export interface AuthTwitterProps {
  consumerKey: string;
  consumerSecret: string;
}

export interface AuthCdkCfnIdentityPoolProps
  extends Omit<cognito.CfnIdentityPoolProps, "allowUnauthenticatedIdentities"> {
  allowUnauthenticatedIdentities?: boolean;
}

export interface AuthCognitoIdentityPoolFederationProps {
  auth0?: AuthAuth0Props;
  amazon?: AuthAmazonProps;
  apple?: AuthAppleProps;
  facebook?: AuthFacebookProps;
  google?: AuthGoogleProps;
  twitter?: AuthTwitterProps;
  cdk?: {
    cfnIdentityPool?: AuthCdkCfnIdentityPoolProps;
  };
}

export interface AuthProps {
  defaults?: {
    /**
     * The default function props to be applied to all the triggers in the UserPool. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     *
     * ```js
     * new Auth(stack, "Auth", {
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
   * new Auth(stack, "Auth", {
   *   triggers: {
   *     preAuthentication: "src/preAuthentication.main",
   *     postAuthentication: "src/postAuthentication.main",
   *   },
   * });
   * ```
   */
  triggers?: AuthUserPoolTriggers;
  /**
   * Configure the Cognito Identity Pool and its authentication providers.
   * @default Identity Pool created with the User Pool as the authentication provider
   */
  identityPoolFederation?: boolean | AuthCognitoIdentityPoolFederationProps;
  cdk?: {
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
 * The `Auth` construct is a higher level CDK construct that makes it easy to configure a [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) and [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). Also, allows setting up Auth0, Facebook, Google, Twitter, Apple, and Amazon as authentication providers.
 */
export class Auth extends Construct implements SSTConstruct {
  public readonly cdk: {
    userPool: cognito.IUserPool;
    userPoolClient: cognito.IUserPoolClient;
    cfnIdentityPool?: cognito.CfnIdentityPool;
    authRole: iam.Role;
    unauthRole: iam.Role;
  };
  private functions: { [key: string]: Fn };
  private permissionsAttachedForAllTriggers: Permissions[];
  private props: AuthProps;

  constructor(scope: Construct, id: string, props?: AuthProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.functions = {};
    this.permissionsAttachedForAllTriggers = [];

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

  public attachPermissionsForAuthUsers(permissions: Permissions): void {
    attachPermissionsToRole(this.cdk.authRole, permissions);
  }

  public attachPermissionsForUnauthUsers(permissions: Permissions): void {
    attachPermissionsToRole(this.cdk.unauthRole, permissions);
  }

  public attachPermissionsForTriggers(permissions: Permissions): void {
    Object.values(this.functions).forEach((fn) =>
      fn.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllTriggers.push(permissions);
  }

  public attachPermissionsForTrigger(
    triggerKey: keyof AuthUserPoolTriggers,
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

  public getFunction(triggerKey: keyof AuthUserPoolTriggers): Fn | undefined {
    return this.functions[triggerKey];
  }

  public getConstructMetadata() {
    return {
      type: "Auth" as const,
      data: {
        identityPoolId: this.cdk.cfnIdentityPool?.ref,
        userPoolId: this.cdk.userPool.userPoolId,
        triggers: Object.entries(this.functions).map(([name, fun]) => ({
          name,
          fn: getFunctionRef(fun),
        })),
      },
    };
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
          `Cannot configure the "cdk.userPool.lambdaTriggers" in the Auth construct. Use the "triggers" instead.`
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
        ...cognitoUserPoolProps,
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
          ...clientProps,
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
      clientId: this.cdk.userPoolClient.userPoolClientId,
    });

    if (typeof identityPoolFederation === "object") {
      const { auth0, amazon, apple, facebook, google, twitter } =
        identityPoolFederation;

      ////////////////////
      // Handle OpenId Connect Providers (ie. Auth0)
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
          clientIds: [auth0.clientId],
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
        ...identityPoolProps,
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
          unauthenticated: this.cdk.unauthRole.roleArn,
        },
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
        triggerKey as keyof AuthUserPoolTriggers,
        triggerValue,
        defaults?.function
      )
    );
  }

  private addTrigger(
    scope: Construct,
    triggerKey: keyof AuthUserPoolTriggers,
    triggerValue: FunctionDefinition,
    functionProps?: FunctionProps
  ): Fn {
    // Validate cognito user pool is defined
    if (!this.cdk.userPool) {
      throw new Error(
        `Triggers cannot be added. No Cognito UserPool defined for the Auth construct.`
      );
    }

    // Create Function
    const lambda = Fn.fromDefinition(
      scope,
      triggerKey,
      triggerValue,
      functionProps,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the triggers using FunctionProps, so the Auth construct can apply the "defaults.function" to them.`
    );

    // Create trigger
    const operation = AuthUserPoolTriggerOperationMapping[triggerKey];
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
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*",
        ],
        resources: ["*"],
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
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
        resources: ["*"],
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
      preferredUsername: login.includes("preferredUsername"),
    };
  }
}
