import { Construct } from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";

import { App } from "./App";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions, attachPermissionsToRole } from "./util/permission";

const AuthUserPoolTriggerOperationMapping = {
  createAuthChallenge: cognito.UserPoolOperation.CREATE_AUTH_CHALLENGE,
  customMessage: cognito.UserPoolOperation.CUSTOM_MESSAGE,
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
  readonly cognito?: boolean | AuthCognitoProps;
  readonly auth0?: AuthAuth0Props;
  readonly amazon?: AuthAmazonProps;
  readonly apple?: AuthAppleProps;
  readonly facebook?: AuthFacebookProps;
  readonly google?: AuthGoogleProps;
  readonly twitter?: AuthTwitterProps;
  readonly identityPool?: AuthCdkCfnIdentityPoolProps;
  // deprecated
  readonly cognitoUserPool?: cognito.IUserPool;
  readonly cognitoUserPoolClient?: cognito.IUserPoolClient;
}

export interface AuthCognitoProps {
  // Note: CDK currently does not support importing existing UserPool because the
  //       imported IUserPool interface does not have the "userPoolProviderName"
  //       property. "userPoolProviderName" needs to be passed into Identity Pool.
  readonly userPool?: cognito.UserPoolProps | cognito.UserPool;
  readonly userPoolClient?:
    | cognito.UserPoolClientOptions
    | cognito.UserPoolClient;
  readonly defaultFunctionProps?: FunctionProps;
  readonly triggers?: AuthUserPoolTriggers;
  // deprecated
  readonly signInAliases?: cognito.SignInAliases;
}

export interface AuthUserPoolTriggers {
  readonly createAuthChallenge?: FunctionDefinition;
  readonly customMessage?: FunctionDefinition;
  readonly defineAuthChallenge?: FunctionDefinition;
  readonly postAuthentication?: FunctionDefinition;
  readonly postConfirmation?: FunctionDefinition;
  readonly preAuthentication?: FunctionDefinition;
  readonly preSignUp?: FunctionDefinition;
  readonly preTokenGeneration?: FunctionDefinition;
  readonly userMigration?: FunctionDefinition;
  readonly verifyAuthChallengeResponse?: FunctionDefinition;
}

export interface AuthAuth0Props {
  readonly domain: string;
  readonly clientId: string;
}

export interface AuthAmazonProps {
  readonly appId: string;
}

export interface AuthAppleProps {
  readonly servicesId: string;
}

export interface AuthFacebookProps {
  readonly appId: string;
}

export interface AuthGoogleProps {
  readonly clientId: string;
}

export interface AuthTwitterProps {
  readonly consumerKey: string;
  readonly consumerSecret: string;
}

export interface AuthCdkCfnIdentityPoolProps
  extends Omit<cognito.CfnIdentityPoolProps, "allowUnauthenticatedIdentities"> {
  readonly allowUnauthenticatedIdentities?: boolean;
}

export class Auth extends Construct implements SSTConstruct {
  public readonly cognitoUserPool?: cognito.UserPool;
  public readonly cognitoUserPoolClient?: cognito.UserPoolClient;
  public readonly cognitoCfnIdentityPool: cognito.CfnIdentityPool;
  public readonly iamAuthRole: iam.Role;
  public readonly iamUnauthRole: iam.Role;
  private readonly functions: { [key: string]: Fn };
  private readonly defaultFunctionProps?: FunctionProps;
  private readonly permissionsAttachedForAllTriggers: Permissions[];

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    // Handle deprecated props
    this.checkDeprecatedProps(props);

    const root = scope.node.root as App;
    const {
      cognito: cognitoProps,
      auth0,
      amazon,
      apple,
      facebook,
      google,
      twitter,
      identityPool,
    } = props;
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
        this.cognitoUserPool = new cognito.UserPool(this, "UserPool", {
          userPoolName: root.logicalPrefixedName(id),
          selfSignUpEnabled: true,
          signInCaseSensitive: false,
        });
      } else if (isCDKConstruct(cognitoProps.userPool)) {
        isUserPoolImported = true;
        this.cognitoUserPool = cognitoProps.userPool;
      } else {
        // validate `lambdaTriggers` is not specified
        if (cognitoProps.userPool && cognitoProps.userPool.lambdaTriggers) {
          throw new Error(
            `Cannot configure the "cognito.userPool.lambdaTriggers" in the Auth construct. Use the "cognito.triggers" instead.`
          );
        }

        this.cognitoUserPool = new cognito.UserPool(this, "UserPool", {
          userPoolName: root.logicalPrefixedName(id),
          selfSignUpEnabled: true,
          signInCaseSensitive: false,
          ...(cognitoProps.userPool || {}),
        });

        // Create Trigger functions
        const { triggers, defaultFunctionProps } = cognitoProps;
        this.defaultFunctionProps = defaultFunctionProps;

        if (triggers) {
          Object.entries(triggers).forEach(([triggerKey, triggerValue]) =>
            this.addTrigger(
              this,
              triggerKey as keyof AuthUserPoolTriggers,
              triggerValue
            )
          );
        }
      }

      // Create User Pool Client
      if (typeof cognitoProps === "boolean") {
        this.cognitoUserPoolClient = new cognito.UserPoolClient(
          this,
          "UserPoolClient",
          {
            userPool: this.cognitoUserPool,
          }
        );
      } else if (isCDKConstruct(cognitoProps.userPoolClient)) {
        if (!isUserPoolImported) {
          throw new Error(
            `Cannot import the "userPoolClient" when the "userPool" is not imported.`
          );
        }
        this.cognitoUserPoolClient = cognitoProps.userPoolClient;
      } else {
        this.cognitoUserPoolClient = new cognito.UserPoolClient(
          this,
          "UserPoolClient",
          {
            userPool: this.cognitoUserPool,
            ...(cognitoProps.userPoolClient || {}),
          }
        );
      }

      // Set cognito providers
      cognitoIdentityProviders.push({
        providerName: this.cognitoUserPool.userPoolProviderName,
        clientId: this.cognitoUserPoolClient.userPoolClientId,
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
    this.cognitoCfnIdentityPool = new cognito.CfnIdentityPool(
      this,
      "IdentityPool",
      {
        identityPoolName: root.logicalPrefixedName(id),
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders,
        supportedLoginProviders,
        openIdConnectProviderArns,
        ...(identityPool || {}),
      }
    );
    this.iamAuthRole = this.createAuthRole(this.cognitoCfnIdentityPool);
    this.iamUnauthRole = this.createUnauthRole(this.cognitoCfnIdentityPool);

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.cognitoCfnIdentityPool.ref,
        roles: {
          authenticated: this.iamAuthRole.roleArn,
          unauthenticated: this.iamUnauthRole.roleArn,
        },
      }
    );
  }

  public get cognitoIdentityPoolId(): string {
    return this.cognitoCfnIdentityPool.ref;
  }

  public attachPermissionsForAuthUsers(permissions: Permissions): void {
    attachPermissionsToRole(this.iamAuthRole, permissions);
  }

  public attachPermissionsForUnauthUsers(permissions: Permissions): void {
    attachPermissionsToRole(this.iamUnauthRole, permissions);
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
        identityPoolId: this.cognitoCfnIdentityPool.ref,
        userPoolId: this.cognitoUserPool?.userPoolId,
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

  private addTrigger(
    scope: Construct,
    triggerKey: keyof AuthUserPoolTriggers,
    triggerValue: FunctionDefinition
  ): Fn {
    // Validate cognito user pool is defined
    if (!this.cognitoUserPool) {
      throw new Error(
        `Triggers cannot be added. No Cognito UserPool defined for the Auth construct.`
      );
    }

    // Create Function
    const lambda = Fn.fromDefinition(
      scope,
      triggerKey,
      triggerValue,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the triggers using FunctionProps, so the Auth construct can apply the "defaultFunctionProps" to them.`
    );

    // Create trigger
    const operation = AuthUserPoolTriggerOperationMapping[triggerKey];
    this.cognitoUserPool.addTrigger(operation, lambda);

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
