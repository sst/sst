import { ComponentResourceOptions, interpolate, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { FunctionArgs } from "./function.js";
import { Input } from "../input";
import { prefixName } from "../naming";

export interface CognitoIdentityPoolArgs {
  /**
   * Configure Cognito user pools as identity providers to your identity pool.
   * @example
   * ```ts
   * {
   *   userPools: [
   *     {
   *       userPool: "us-east-1_QY6Ly46JH",
   *       client: "6va5jg3cgtrd170sgokikjm5m6"
   *     },
   *   ],
   * }
   * ```
   */
  userPools?: Input<
    Input<{
      /**
       * The Cognito user pool ID.
       */
      userPool: Input<string>;
      /**
       * The Cognito user pool client ID.
       */
      client: Input<string>;
    }>[]
  >;
  /**
   * The permissions to attach to the authenticated and unauthenticated roles.
   * This allows the authenticated and unauthenticated users to access other AWS resources.
   *
   * @example
   * ```js
   * {
   *   permissions: {
   *     authenticated: [
   *       {
   *         actions: ["s3:GetObject", "s3:PutObject"],
   *         resources: ["arn:aws:s3:::my-bucket/*"]
   *       }
   *     ],
   *     unauthenticated: [
   *       {
   *         actions: ["s3:GetObject"],
   *         resources: ["arn:aws:s3:::my-bucket/*"]
   *       }
   *     ]
   *   }
   * }
   * ```
   */
  permissions?: Input<{
    /**
     * Attaches the given list of permissions to the authenticated users.
     */
    authenticated?: FunctionArgs["permissions"];
    /**
     * Attaches the given list of permissions to the unauthenticated users.
     */
    unauthenticated?: FunctionArgs["permissions"];
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Cognito identity pool resource.
     */
    identityPool?: Transform<aws.cognito.IdentityPoolArgs>;
    /**
     * Transform the authenticated IAM role resource.
     */
    authenticatedRole?: Transform<aws.iam.RoleArgs>;
    /**
     * Transform the unauthenticated IAM role resource.
     */
    unauthenticatedRole?: Transform<aws.iam.RoleArgs>;
  };
}

/**
 * The `CognitoIdentityPool` component lets you add a [Amazon Cognito identity pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html) to your app.
 *
 * #### Creating the identity pool
 *
 * ```ts
 * new sst.aws.CognitoIdentityPool("MyIdentityPool", {
 *   userPools: [
 *     {
 *       userPool: "us-east-1_QY6Ly46JH",
 *       client: "6va5jg3cgtrd170sgokikjm5m6"
 *     }
 *   ]
 * });
 * ```
 *
 * #### Configure permissions for authenticated users
 *
 * ```ts
 * new sst.aws.CognitoIdentityPool("MyIdentityPool", {
 *   userPools: [
 *     {
 *       userPool: "us-east-1_QY6Ly46JH",
 *       client: "6va5jg3cgtrd170sgokikjm5m6"
 *     }
 *   ],
 *   permissions: {
 *     authenticated: [
 *       {
 *         actions: ["s3:GetObject", "s3:PutObject"],
 *         resources: ["arn:aws:s3:::my-bucket/*"]
 *       }
 *     ]
 *   }
 * });
 * ```
 */
export class CognitoIdentityPool extends Component {
  private identityPool: aws.cognito.IdentityPool;
  private authRole: aws.iam.Role;
  private unauthRole: aws.iam.Role;

  constructor(
    name: string,
    args: CognitoIdentityPoolArgs = {},
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const region = getRegion();
    const identityPool = createIdentityPool();
    const authRole = createAuthRole();
    const unauthRole = createUnauthRole();
    createRoleAttachment();

    this.identityPool = identityPool;
    this.authRole = authRole;
    this.unauthRole = unauthRole;

    function getRegion() {
      return aws.getRegionOutput(undefined, { provider: opts?.provider }).name;
    }

    function createIdentityPool() {
      return new aws.cognito.IdentityPool(
        `${name}IdentityPool`,
        transform(args.transform?.identityPool, {
          identityPoolName: prefixName(128, name),
          allowUnauthenticatedIdentities: true,
          cognitoIdentityProviders:
            args.userPools &&
            output(args.userPools).apply((userPools) =>
              userPools.map((v) => ({
                clientId: v.client,
                providerName: interpolate`cognito-idp.${region}.amazonaws.com/${v.userPool}`,
              })),
            ),
          supportedLoginProviders: {},
        }),
        { parent },
      );
    }

    function createAuthRole() {
      const policy = output(args.permissions).apply((permissions) =>
        aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              effect: "Allow",
              actions: [
                "mobileanalytics:PutEvents",
                "cognito-sync:*",
                "cognito-identity:*",
              ],
              resources: ["*"],
            },
            ...(permissions?.authenticated || []),
          ],
        }),
      );

      return new aws.iam.Role(
        `${name}AuthRole`,
        transform(args.transform?.authenticatedRole, {
          assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
            statements: [
              {
                effect: "Allow",
                principals: [
                  {
                    type: "Federated",
                    identifiers: ["cognito-identity.amazonaws.com"],
                  },
                ],
                actions: ["sts:AssumeRoleWithWebIdentity"],
                conditions: [
                  {
                    test: "StringEquals",
                    variable: "cognito-identity.amazonaws.com:aud",
                    values: [identityPool.id],
                  },
                  {
                    test: "ForAnyValue:StringLike",
                    variable: "cognito-identity.amazonaws.com:amr",
                    values: ["authenticated"],
                  },
                ],
              },
            ],
          }).json,
          inlinePolicies: [{ name: "inline", policy: policy.json }],
        }),
        { parent },
      );
    }

    function createUnauthRole() {
      const policy = output(args.permissions).apply((permissions) =>
        aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              effect: "Allow",
              actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
              resources: ["*"],
            },
            ...(permissions?.unauthenticated || []),
          ],
        }),
      );

      return new aws.iam.Role(
        `${name}UnauthRole`,
        transform(args.transform?.unauthenticatedRole, {
          assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
            statements: [
              {
                effect: "Allow",
                principals: [
                  {
                    type: "Federated",
                    identifiers: ["cognito-identity.amazonaws.com"],
                  },
                ],
                actions: ["sts:AssumeRoleWithWebIdentity"],
                conditions: [
                  {
                    test: "StringEquals",
                    variable: "cognito-identity.amazonaws.com:aud",
                    values: [identityPool.id],
                  },
                  {
                    test: "ForAnyValue:StringLike",
                    variable: "cognito-identity.amazonaws.com:amr",
                    values: ["unauthenticated"],
                  },
                ],
              },
            ],
          }).json,
          inlinePolicies: [{ name: "inline", policy: policy.json }],
        }),
        { parent },
      );
    }

    function createRoleAttachment() {
      return new aws.cognito.IdentityPoolRoleAttachment(
        `${name}RoleAttachment`,
        {
          identityPoolId: identityPool.id,
          roles: {
            authenticated: authRole.arn,
            unauthenticated: unauthRole.arn,
          },
        },
        { parent },
      );
    }
  }

  /**
   * The Cognito identity pool ID.
   */
  public get id() {
    return this.identityPool.id;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon Cognito identity pool.
       */
      identityPool: this.identityPool,
      /**
       * The authenticated IAM role.
       */
      authenticatedRole: this.authRole,
      /**
       * The unauthenticated IAM role.
       */
      unauthenticatedRole: this.unauthRole,
    };
  }
}

const __pulumiType = "sst:aws:CognitoIdentityPool";
// @ts-expect-error
CognitoIdentityPool.__pulumiType = __pulumiType;
