import { ComponentResourceOptions, all, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Input } from "../input";
import { Link } from "../link";
import { CognitoUserPoolClient } from "./cognito-user-pool-client";
import { Function, FunctionArgs } from "./function.js";
import { VisibleError } from "../error";

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
   *     postAuthentication: "src/postAuthentication.handler",
   *   },
   * }
   * ```
   */
  triggers?: Input<{
    /**
     * ARN of the lambda function to present a custom challenge and its answer.
     */
    createAuthChallenge?: string | FunctionArgs;
    /**
     * ARN of the custom email sender function.
     */
    customEmailSender?: string | FunctionArgs;
    /**
     * ARN of the lambda function to add customization and localization of verification, recovery, and MFA messages.
     */
    customMessage?: string | FunctionArgs;
    /**
     * ARN of the custom SMS sender function.
     */
    customSmsSender?: string | FunctionArgs;
    /**
     * ARN of the lambda function to name a custom challenge.
     */
    defineAuthChallenge?: string | FunctionArgs;
    /**
     * ARN of the lambda function to add custom logging and analytics for authenticated sessions.
     */
    postAuthentication?: string | FunctionArgs;
    /**
     * ARN of the lambda function to customize welcome messages and log events for custom analytics.
     */
    postConfirmation?: string | FunctionArgs;
    /**
     * ARN of the lambda function to modify or deny sign-in with custom logic.
     */
    preAuthentication?: string | FunctionArgs;
    /**
     * ARN of the lambda function to validate users when they sign up and customize their attributes.
     */
    preSignUp?: string | FunctionArgs;
    /**
     * ARN of the lambda function to modify claims in ID and access tokens.
     */
    preTokenGenerationConfig?: string | FunctionArgs;
    /**
     * ARN of the lambda function to migrate a user from another directory when they sign in to your user pool.
     */
    userMigration?: string | FunctionArgs;
    /**
     * ARN of the lambda function to compare user answer to expected answer for a custom challenge.
     */
    verifyAuthChallengeResponse?: string | FunctionArgs;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cognito user pool resource.
     */
    userPool?: Transform<aws.cognito.UserPoolArgs>;
  };
}

export interface CognitoUserPoolClientArgs {
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cognito user pool client resource.
     */
    client?: Transform<aws.cognito.UserPoolClientArgs>;
  };
}

/**
 * The `CognitoUserPool` component lets you add a [Amazon Cognito user pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) to your app.
 *
 * #### Create the user pool
 *
 * ```ts
 * const userPool = new sst.aws.CognitoUserPool("MyUserPool");
 * ```
 *
 * #### Login using email
 *
 * ```ts
 * new sst.aws.CognitoUserPool("MyUserPool", {
 *   usernames: ["email"]
 * });
 * ```
 *
 * #### Configure triggers
 *
 * ```ts
 * new sst.aws.CognitoUserPool("MyUserPool", {
 *   triggers: {
 *     preAuthentication: "src/preAuthentication.handler",
 *     postAuthentication: "src/postAuthentication.handler",
 *   },
 * });
 * ```
 *
 * #### Add a client
 *
 * ```ts
 * userPool.addClient("Web");
 * ```
 */
export class CognitoUserPool
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private userPool: aws.cognito.UserPool;

  constructor(
    name: string,
    args: CognitoUserPoolArgs = {},
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    normalizeAliasesAndUsernames();
    const triggers = createTriggers();
    const userPool = createUserPool();
    createPermissions();

    this.userPool = userPool;

    function normalizeAliasesAndUsernames() {
      all([args.aliases, args.usernames]).apply(([aliases, usernames]) => {
        if (aliases && usernames) {
          throw new VisibleError(
            "You cannot set both aliases and usernames. Learn more about customizing sign-in attributes at https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases",
          );
        }
      });
    }

    function createTriggers() {
      if (!args.triggers) return;

      return output(args.triggers).apply((triggers) =>
        Object.fromEntries(
          Object.entries(triggers).map(([trigger, value]) => {
            const fn = Function.fromDefinition(
              `${name}Trigger${trigger}`,
              value,
              {
                description: `Subscribed to ${trigger} from ${name}`,
              },
              undefined,
              { parent },
            );
            return [trigger, fn.arn];
          }),
        ),
      );
    }

    function createUserPool() {
      return new aws.cognito.UserPool(
        `${name}UserPool`,
        transform(args.transform?.userPool, {
          aliasAttributes:
            args.aliases &&
            output(args.aliases).apply((aliases) => [
              ...(aliases.includes("email") ? ["email"] : []),
              ...(aliases.includes("phone") ? ["phoneNumber"] : []),
              ...(aliases.includes("preferred_username")
                ? ["perferredUsername"]
                : []),
            ]),
          usernameAttributes:
            args.usernames &&
            output(args.usernames).apply((usernames) => [
              ...(usernames.includes("email") ? ["email"] : []),
              ...(usernames.includes("phone") ? ["phoneNumber"] : []),
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
              ...(attributes.includes("phone") ? ["phoneNumber"] : []),
            ];
          }),
          emailConfiguration: {
            emailSendingAccount: "COGNITO_DEFAULT",
          },
          verificationMessageTemplate: {
            defaultEmailOption: "CONFIRM_WITH_CODE",
            emailMessage: "The verification code to your new account is {####}",
            emailSubject: "Verify your new account",
            smsMessage: "The verification code to your new account is {####}",
          },
          lambdaConfig: triggers,
        }),
        { parent },
      );
    }

    function createPermissions() {
      if (!triggers) return;

      triggers.apply((triggers) => {
        Object.entries(triggers).forEach(([trigger, functionArn]) => {
          new aws.lambda.Permission(
            `${name}Permission${trigger}`,
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
   * The Cognito user pool ID.
   */
  public get id() {
    return this.userPool.id;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon Cognito user pool.
       */
      userPool: this.userPool,
    };
  }

  /**
   * Add a client to the user pool.
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
    return new CognitoUserPoolClient(name, {
      userPool: this.id,
      ...args,
    });
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        id: this.id,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["cognito-idp:*"],
        resources: [this.userPool.arn],
      },
    ];
  }
}

const __pulumiType = "sst:aws:CognitoUserPool";
// @ts-expect-error
CognitoUserPool.__pulumiType = __pulumiType;
