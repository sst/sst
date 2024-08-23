import { ComponentResourceOptions, all, output } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Input } from "../input";
import { Link } from "../link";
import { CognitoIdentityProvider } from "./cognito-identity-provider";
import { CognitoUserPoolClient } from "./cognito-user-pool-client";
import { Function, FunctionArgs } from "./function.js";
import { VisibleError } from "../error";
import { cognito, lambda } from "@pulumi/aws";
import { permission } from "./permission";

export interface CognitoUserPoolArgs {
  /**
   * Configure the different ways a user can sign in besides using their username.
   *
   * :::note
   * You cannot change the aliases property once the User Pool has been created.
   * Learn more about [aliases](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases).
   * :::
   *
   * @default User can only sign in with their username.
   * @example
   *
   * ```ts
   * {
   *   aliases: ["email"]
   * }
   * ```
   */
  aliases?: Input<Input<"email" | "phone" | "preferred_username">[]>;
  /**
   * Allow users to be able to sign up and sign in with an email addresses or phone number
   * as their username.
   *
   * :::note
   * You cannot change the usernames property once the User Pool has been created.
   * Learn more about [aliases](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases).
   * :::
   *
   * @default User can only sign in with their username.
   * @example
   *
   * ```ts
   * {
   *   usernames: ["email"]
   * }
   * ```
   */
  usernames?: Input<Input<"email" | "phone">[]>;
  /**
   * Configure triggers for this User Pool
   * @default No triggers
   * @example
   *
   * ```js
   * {
   *   triggers: {
   *     preAuthentication: "src/preAuthentication.handler",
   *     postAuthentication: "src/postAuthentication.handler"
   *   }
   * }
   * ```
   */
  triggers?: Input<{
    /**
     * The ARN of the AWS KMS key used for encryption.
     *
     * When `customEmailSender` or `customSmsSender` are configured, Cognito encrypts the
     * verification code and temporary passwords before sending them to your Lambda functions.
     */
    kmsKey?: string;
    /**
     * Triggered after the user successfully responds to the previous challenge, and a new
     * challenge needs to be created.
     *
     * Takes the handler path or the function args.
     */
    createAuthChallenge?: string | FunctionArgs;
    /**
     * Triggered during events like user sign-up, password recovery, email/phone number
     * verification, and when an admin creates a user. Use this trigger to customize the
     * email provider.
     *
     * Takes the handler path or the function args.
     */
    customEmailSender?: string | FunctionArgs;
    /**
     * Triggered during events like user sign-up, password recovery, email/phone number
     * verification, and when an admin creates a user. Use this trigger to customize the
     * message that is sent to your users.
     *
     * Takes the handler path or the function args.
     */
    customMessage?: string | FunctionArgs;
    /**
     * Triggered when an SMS message needs to be sent, such as for MFA or verification codes.
     * Use this trigger to customize the SMS provider.
     *
     * Takes the handler path or the function args.
     */
    customSmsSender?: string | FunctionArgs;
    /**
     * Triggered after each challenge response to determine the next action. Evaluates whether the
     * user has completed the authentication process or if additional challenges are needed.
     * ARN of the lambda function to name a custom challenge.
     *
     * Takes the handler path or the function args.
     */
    defineAuthChallenge?: string | FunctionArgs;
    /**
     * Triggered after a successful authentication event. Use this to perform custom actions,
     * such as logging or modifying user attributes, after the user is authenticated.
     *
     * Takes the handler path or the function args.
     */
    postAuthentication?: string | FunctionArgs;
    /**
     * Triggered after a user is successfully confirmed; sign-up or email/phone number
     * verification. Use this to perform additional actions, like sending a welcome email or
     * initializing user data, after user confirmation.
     *
     * Takes the handler path or the function args.
     */
    postConfirmation?: string | FunctionArgs;
    /**
     * Triggered before the authentication process begins. Use this to implement custom
     * validation or checks (like checking if the user is banned) before continuing
     * authentication.
     *
     * Takes the handler path or the function args.
     */
    preAuthentication?: string | FunctionArgs;
    /**
     * Triggered before the user sign-up process completes. Use this to perform custom
     * validation, auto-confirm users, or auto-verify attributes based on custom logic.
     *
     * Takes the handler path or the function args.
     */
    preSignUp?: string | FunctionArgs;
    /**
     * Triggered before tokens are generated in the authentication process. Use this to
     * customize or add claims to the tokens that will be generated and returned to the user.
     *
     * Takes the handler path or the function args.
     */
    preTokenGeneration?: string | FunctionArgs;
    /**
     * Triggered when a user attempts to sign in but does not exist in the current user pool.
     * Use this to import and validate users from an existing user directory into the
     * Cognito User Pool during sign-in.
     *
     * Takes the handler path or the function args.
     */
    userMigration?: string | FunctionArgs;
    /**
     * Triggered after the user responds to a custom authentication challenge. Use this to
     * verify the user's response to the challenge and determine whether to continue
     * authenticating the user.
     *
     * Takes the handler path or the function args.
     */
    verifyAuthChallengeResponse?: string | FunctionArgs;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cognito User Pool resource.
     */
    userPool?: Transform<cognito.UserPoolArgs>;
  };
}

export interface CognitoIdentityProviderArgs {
  /**
   * The type of identity provider.
   */
  type: Input<"oidc" | "saml" | "google" | "facebook" | "apple" | "amazon">;
  /**
   * Configure the identity provider details, including the scopes, URLs, and identifiers.
   *
   * ```ts
   * {
   *   authorize_scopes: "email profile",
   *   client_id: "your-client-id",
   *   client_secret: "your-client-secret"
   * }
   * ```
   */
  details: Input<Record<string, Input<string>>>;
  /**
   * Define a mapping between identity provider attributes and user pool attributes.
   *
   * ```ts
   * {
   *   email: "email",
   *   username: "sub"
   * }
   * ```
   */
  attributes?: Input<Record<string, Input<string>>>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cognito identity provider resource.
     */
    identityProvider?: Transform<cognito.IdentityProviderArgs>;
  };
}

export interface CognitoUserPoolClientArgs {
  /**
   * A list of identity providers that are supported for this client.
   * @default `["COGNITO"]`
   */
  providers?: Input<Input<string>[]>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cognito User Pool client resource.
     */
    client?: Transform<cognito.UserPoolClientArgs>;
  };
}

/**
 * The `CognitoUserPool` component lets you add a [Amazon Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) to your app.
 *
 * #### Create the user pool
 *
 * ```ts title="sst.config.ts"
 * const userPool = new sst.aws.CognitoUserPool("MyUserPool");
 * ```
 *
 * #### Login using email
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.CognitoUserPool("MyUserPool", {
 *   usernames: ["email"]
 * });
 * ```
 *
 * #### Configure triggers
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.CognitoUserPool("MyUserPool", {
 *   triggers: {
 *     preAuthentication: "src/preAuthentication.handler",
 *     postAuthentication: "src/postAuthentication.handler",
 *   },
 * });
 * ```
 *
 * #### Add Google identity provider
 *
 * ```ts title="sst.config.ts"
 * const GoogleClientId = new sst.Secret("GOOGLE_CLIENT_ID");
 * const GoogleClientSecret = new sst.Secret("GOOGLE_CLIENT_SECRET");
 *
 * userPool.addIdentityProvider({
 *   type: "google",
 *   details: {
 *     authorize_scopes: "email profile",
 *     client_id: GoogleClientId.value,
 *     client_secret: GoogleClientSecret.value,
 *   },
 *   attributes: {
 *     email: "email",
 *     name: "name",
 *     username: "sub",
 *   },
 * });
 * ```
 *
 * #### Add a client
 *
 * ```ts title="sst.config.ts"
 * userPool.addClient("Web");
 * ```
 */
export class CognitoUserPool extends Component implements Link.Linkable {
  private constructorOpts: ComponentResourceOptions;
  private userPool: cognito.UserPool;

  constructor(
    name: string,
    args: CognitoUserPoolArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    normalizeAliasesAndUsernames();
    const triggers = createTriggers();
    const userPool = createUserPool();
    createPermissions();

    this.constructorOpts = opts;
    this.userPool = userPool;

    function normalizeAliasesAndUsernames() {
      all([args.aliases, args.usernames]).apply(([aliases, usernames]) => {
        if (aliases && usernames)
          throw new VisibleError(
            "You cannot set both aliases and usernames. Learn more about customizing sign-in attributes at https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases",
          );
      });
    }

    function createTriggers() {
      if (!args.triggers) return;

      return output(args.triggers).apply((triggers) => {
        if (
          (triggers.customEmailSender || triggers.customSmsSender) &&
          !triggers.kmsKey
        )
          throw new VisibleError(
            "You must provide a KMS key via `kmsKey` when configuring `customEmailSender` or `customSmsSender`.",
          );

        return Object.fromEntries(
          Object.entries(triggers).map(([key, value]) => {
            if (key === "kmsKey") return [key, output(value as string)];

            const fn = Function.fromDefinition(
              `${name}Trigger${key}`,
              value,
              {
                description: `Subscribed to ${key} from ${name}`,
              },
              undefined,
              { parent },
            );
            return [key, fn.arn];
          }),
        );
      });
    }

    function createUserPool() {
      return new cognito.UserPool(
        ...transform(
          args.transform?.userPool,
          `${name}UserPool`,
          {
            aliasAttributes:
              args.aliases &&
              output(args.aliases).apply((aliases) => [
                ...(aliases.includes("email") ? ["email"] : []),
                ...(aliases.includes("phone") ? ["phone_number"] : []),
                ...(aliases.includes("preferred_username")
                  ? ["preferred_username"]
                  : []),
              ]),
            usernameAttributes:
              args.usernames &&
              output(args.usernames).apply((usernames) => [
                ...(usernames.includes("email") ? ["email"] : []),
                ...(usernames.includes("phone") ? ["phone_number"] : []),
              ]),
            accountRecoverySetting: {
              recoveryMechanisms: [
                {
                  name: "verified_phone_number",
                  priority: 1,
                },
                {
                  name: "verified_email",
                  priority: 2,
                },
              ],
            },
            adminCreateUserConfig: {
              allowAdminCreateUserOnly: false,
            },
            usernameConfiguration: {
              caseSensitive: false,
            },
            autoVerifiedAttributes: all([
              args.aliases || [],
              args.usernames || [],
            ]).apply(([aliases, usernames]) => {
              const attributes = [...aliases, ...usernames];
              return [
                ...(attributes.includes("email") ? ["email"] : []),
                ...(attributes.includes("phone") ? ["phone_number"] : []),
              ];
            }),
            emailConfiguration: {
              emailSendingAccount: "COGNITO_DEFAULT",
            },
            verificationMessageTemplate: {
              defaultEmailOption: "CONFIRM_WITH_CODE",
              emailMessage:
                "The verification code to your new account is {####}",
              emailSubject: "Verify your new account",
              smsMessage: "The verification code to your new account is {####}",
            },
            lambdaConfig:
              triggers &&
              triggers.apply((triggers) => ({
                kmsKeyId: triggers.kmsKey,
                createAuthChallenge: triggers.createAuthChallenge,
                customEmailSender: triggers.customEmailSender && {
                  lambdaArn: triggers.customEmailSender,
                  lambdaVersion: "V1_0",
                },
                customMessage: triggers.customMessage,
                customSmsSender: triggers.customSmsSender && {
                  lambdaArn: triggers.customSmsSender,
                  lambdaVersion: "V1_0",
                },
                defineAuthChallenge: triggers.defineAuthChallenge,
                postAuthentication: triggers.postAuthentication,
                postConfirmation: triggers.postConfirmation,
                preAuthentication: triggers.preAuthentication,
                preSignUp: triggers.preSignUp,
                preTokenGeneration: triggers.preTokenGeneration,
                userMigration: triggers.userMigration,
                verifyAuthChallengeResponse:
                  triggers.verifyAuthChallengeResponse,
              })),
          },
          { parent },
        ),
      );
    }

    function createPermissions() {
      if (!triggers) return;

      triggers.apply((triggers) => {
        Object.entries(triggers).forEach(([key, functionArn]) => {
          if (key === "kmsKey") return;

          new lambda.Permission(
            `${name}Permission${key}`,
            {
              action: "lambda:InvokeFunction",
              function: functionArn,
              principal: "cognito-idp.amazonaws.com",
              sourceArn: userPool.arn,
            },
            { parent },
          );
        });
      });
    }
  }

  /**
   * The Cognito User Pool ID.
   */
  public get id() {
    return this.userPool.id;
  }

  /**
   * The Cognito User Pool ARN.
   */
  public get arn() {
    return this.userPool.arn;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon Cognito User Pool.
       */
      userPool: this.userPool,
    };
  }

  /**
   * Add a client to the User Pool.
   *
   * @param name Name of the client.
   * @param args Configure the client.
   *
   * @example
   *
   * ```ts
   * userPool.addClient("Web");
   * ```
   */
  public addClient(name: string, args?: CognitoUserPoolClientArgs) {
    return new CognitoUserPoolClient(
      name,
      {
        userPool: this.id,
        ...args,
      },
      { provider: this.constructorOpts.provider },
    );
  }

  /**
   * Add a federated identity provider to the User Pool.
   *
   * @param name Name of the identity provider.
   * @param args Configure the identity provider.
   *
   * @example
   *
   * For example, add a GitHub (OIDC) identity provider.
   *
   * ```ts title="sst.config.ts"
   * const GithubClientId = new sst.Secret("GITHUB_CLIENT_ID");
   * const GithubClientSecret = new sst.Secret("GITHUB_CLIENT_SECRET");
   *
   * userPool.addIdentityProvider("GitHub", {
   *   type: "oidc",
   *   details: {
   *      authorize_scopes: "read:user user:email",
   *      client_id: GithubClientId.value,
   *      client_secret: GithubClientSecret.value,
   *      oidc_issuer: "https://github.com/",
   *   },
   *   attributes: {
   *     email: "email",
   *     username: "sub",
   *   },
   * });
   * ```
   *
   * Or add a Google identity provider.
   *
   * ```ts title="sst.config.ts"
   * const GoogleClientId = new sst.Secret("GOOGLE_CLIENT_ID");
   * const GoogleClientSecret = new sst.Secret("GOOGLE_CLIENT_SECRET");
   *
   * userPool.addIdentityProvider("Google", {
   *   type: "google",
   *   details: {
   *     authorize_scopes: "email profile",
   *     client_id: GoogleClientId.value,
   *     client_secret: GoogleClientSecret.value,
   *   },
   *   attributes: {
   *     email: "email",
   *     name: "name",
   *     username: "sub",
   *   },
   * });
   * ```
   */
  public addIdentityProvider(name: string, args: CognitoIdentityProviderArgs) {
    return new CognitoIdentityProvider(
      name,
      {
        userPool: this.id,
        ...args,
      },
      { provider: this.constructorOpts.provider },
    );
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        id: this.id,
      },
      include: [
        permission({
          actions: ["cognito-idp:*"],
          resources: [this.userPool.arn],
        }),
      ],
    };
  }
}

const __pulumiType = "sst:aws:CognitoUserPool";
// @ts-expect-error
CognitoUserPool.__pulumiType = __pulumiType;
