import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";

import { App } from "./App";
import { Stack } from "./Stack";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions, attachPermissionsToRole } from "./util/permission";

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

export interface AuthProps {
  cognito?: boolean | AuthCognitoProps;
  auth0?: AuthAuth0Props;
  amazon?: AuthAmazonProps;
  apple?: AuthAppleProps;
  facebook?: AuthFacebookProps;
  google?: AuthGoogleProps;
  twitter?: AuthTwitterProps;
  cdk?: {
    cfnIdentityPool?: AuthCdkCfnIdentityPoolProps;
  };
  // deprecated
  cognitoUserPool?: cognito.IUserPool;
  cognitoUserPoolClient?: cognito.IUserPoolClient;
}

export interface AuthCognitoProps {
  cdk?: {
    userPool?: cognito.UserPoolProps | cognito.IUserPool;
    userPoolClient?: cognito.UserPoolClientOptions | cognito.IUserPoolClient;
  };
  defaults?: {
    function?: FunctionProps;
  };
  triggers?: AuthUserPoolTriggers;
  // deprecated
  signInAliases?: cognito.SignInAliases;
}

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

/////////////////////
// Construct
/////////////////////

export class Auth extends Construct implements SSTConstruct {
  public readonly cdk: {
    userPool?: cognito.IUserPool;
    userPoolClient?: cognito.IUserPoolClient;
    cfnIdentityPool: cognito.CfnIdentityPool;
    authRole: iam.Role;
    unauthRole: iam.Role;
  };
  private readonly props: AuthProps;
  private functions: { [key: string]: Fn };
  private permissionsAttachedForAllTriggers: Permissions[];

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    // Handle deprecated props
    this.checkDeprecatedProps(props);

    const app = scope.node.root as App;
    this.props = props;
    const {
      cognito: cognitoProps,
      auth0,
      amazon,
      apple,
      facebook,
      google,
      twitter,
      cdk,
    } = this.props;
    this.cdk = {} as any;
    this.functions = {};
    this.permissionsAttachedForAllTriggers = [];

    ////////////////////
    // Handle Cognito Identity Providers (ie. User Pool)
    ////////////////////
    const cognitoIdentityProviders = [];

    if (cognitoProps) {
      let isUserPoolImported = false;

      // Create User Pool
      if (typeof cognitoProps === "boolean") {
        this.cdk.userPool = new cognito.UserPool(this, "UserPool", {
          userPoolName: app.logicalPrefixedName(id),
          selfSignUpEnabled: true,
          signInCaseSensitive: false,
        });
      } else if (isCDKConstruct(cognitoProps.cdk?.userPool)) {
        isUserPoolImported = true;
        this.cdk.userPool = cognitoProps.cdk?.userPool;
        this.addTriggers(cognitoProps);
      } else {
        // validate `lambdaTriggers` is not specified
        if (
          cognitoProps.cdk?.userPool &&
          cognitoProps.cdk?.userPool.lambdaTriggers
        ) {
          throw new Error(
            `Cannot configure the "cognito.userPool.lambdaTriggers" in the Auth construct. Use the "cognito.triggers" instead.`
          );
        }

        this.cdk.userPool = new cognito.UserPool(this, "UserPool", {
          userPoolName: app.logicalPrefixedName(id),
          selfSignUpEnabled: true,
          signInCaseSensitive: false,
          ...(cognitoProps.cdk?.userPool || {}),
        });
        this.addTriggers(cognitoProps);
      }

      // Create User Pool Client
      if (typeof cognitoProps === "boolean") {
        this.cdk.userPoolClient = new cognito.UserPoolClient(
          this,
          "UserPoolClient",
          {
            userPool: this.cdk.userPool!,
          }
        );
      } else if (isCDKConstruct(cognitoProps.cdk?.userPoolClient)) {
        if (!isUserPoolImported) {
          throw new Error(
            `Cannot import the "userPoolClient" when the "userPool" is not imported.`
          );
        }
        this.cdk.userPoolClient = cognitoProps.cdk?.userPoolClient;
      } else {
        this.cdk.userPoolClient = new cognito.UserPoolClient(
          this,
          "UserPoolClient",
          {
            userPool: this.cdk.userPool!,
            ...cognitoProps.cdk?.userPoolClient,
          }
        );
      }

      // Set cognito providers
      const urlSuffix = Stack.of(scope).urlSuffix;
      cognitoIdentityProviders.push({
        providerName: `cognito-idp.${app.region}.${urlSuffix}/${
          this.cdk.userPool!.userPoolId
        }`,
        clientId: this.cdk.userPoolClient!.userPoolClientId,
      });
    }

    ////////////////////
    // Handle OpenId Connect Providers (ie. Auth0)
    ////////////////////
    const openIdConnectProviderArns = [];

    if (auth0) {
      if (!auth0.domain) {
        throw new Error(`No Auth0 domain defined for the "${id}" Auth`);
      }
      if (!auth0.clientId) {
        throw new Error(`No Auth0 clientId defined for the "${id}" Auth`);
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
    const supportedLoginProviders = {} as { [key: string]: string };

    if (amazon) {
      if (!amazon.appId) {
        throw new Error(`No Amazon appId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["www.amazon.com"] = amazon.appId;
    }
    if (facebook) {
      if (!facebook.appId) {
        throw new Error(`No Facebook appId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["graph.facebook.com"] = facebook.appId;
    }
    if (google) {
      if (!google.clientId) {
        throw new Error(`No Google appId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["accounts.google.com"] = google.clientId;
    }
    if (twitter) {
      if (!twitter.consumerKey) {
        throw new Error(`No Twitter consumer key defined for the "${id}" Auth`);
      }
      if (!twitter.consumerSecret) {
        throw new Error(
          `No Twitter consumer secret defined for the "${id}" Auth`
        );
      }
      supportedLoginProviders[
        "api.twitter.com"
      ] = `${twitter.consumerKey};${twitter.consumerSecret}`;
    }
    if (apple) {
      if (!apple.servicesId) {
        throw new Error(`No Apple servicesId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["appleid.apple.com"] = apple.servicesId;
    }

    ////////////////////
    // Create Identity Pool
    ////////////////////

    // Create Cognito Identity Pool
    this.cdk.cfnIdentityPool = new cognito.CfnIdentityPool(
      this,
      "IdentityPool",
      {
        identityPoolName: app.logicalPrefixedName(id),
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders,
        supportedLoginProviders,
        openIdConnectProviderArns,
        ...cdk?.cfnIdentityPool,
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

  public get cognitoIdentityPoolId(): string {
    return this.cdk.cfnIdentityPool.ref;
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
        identityPoolId: this.cdk.cfnIdentityPool.ref,
        userPoolId: this.cdk.userPool?.userPoolId,
        triggers: Object.entries(this.functions).map(([name, fun]) => ({
          name,
          fn: getFunctionRef(fun),
        })),
      },
    };
  }

  private checkDeprecatedProps(props: AuthProps): void {
    if (props.cognitoUserPool) {
      throw new Error(
        `The "cognitoUserPool" property is deprecated. Use the "cognito.userPool" instead. More details on upgrading - https://docs.serverless-stack.com/constructs/Auth#upgrading-to-v0120`
      );
    }
    if (props.cognitoUserPoolClient) {
      throw new Error(
        `The "cognitoUserPoolClient" property is deprecated. Use the "cognito.userPoolClient" instead. More details on upgrading - https://docs.serverless-stack.com/constructs/Auth#upgrading-to-v0120`
      );
    }
    if (props.cognito) {
      if (props.cognito !== true && props.cognito?.signInAliases) {
        throw new Error(
          `The "cognito.signInAliases" property is deprecated. Use the "cognito.userPool.signInAliases" instead. More details on upgrading - https://docs.serverless-stack.com/constructs/Auth#upgrading-to-v0120`
        );
      }
    }
  }

  private addTriggers(cognitoProps: AuthCognitoProps): void {
    const { triggers, defaults } = cognitoProps;

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
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the triggers using FunctionProps, so the Auth construct can apply the "defaults.functionProps" to them.`
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
}
