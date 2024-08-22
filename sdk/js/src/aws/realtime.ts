import { IoTCustomAuthorizerHandler, PolicyDocument } from "aws-lambda";

/**
 * The `realtime` client SDK is available through the following.
 *
 * @example
 * ```js title="src/authorizer.ts"
 * import { realtime } from "sst/aws/realtime";
 * ```
 */
export module realtime {
  export interface AuthResult {
    /**
     * The principal ID of the authorized client. This could be (but is not limited to) a user ID, an email address, or a phone number.
     */
    principalId?: string;

    /**
     * How long the client should be disconnected after the token expires.
     */
    disconnectAfterInSeconds?: number;

    /**
     * How long the client should be refreshed after the token expires.
     */
    refreshAfterInSeconds?: number;

    /**
     * The topics the client can subscribe to.
     * @example
     * For example, this subscribes to two specific topics.
     * ```js
     * {
     *   subscribe: ["chat/room1", "chat/room2"]
     * }
     * ```
     *
     * And to subscribe to all topics under a given prefix.
     * ```js
     * {
     *   subscribe: ["chat/*"]
     * }
     * ```
     */
    subscribe?: string[];

    /**
     * The topics the client can publish to.
     * @example
     * For example, this publishes to two specific topics.
     * ```js
     * {
     *   publish: ["chat/room1", "chat/room2"]
     * }
     * ```
     * And to publish to all topics under a given prefix.
     * ```js
     * {
     *   publish: ["chat/*"]
     * }
     * ```
     */
    publish?: string[];

    /**
     * Any additional policy documents to attach to the client.
     * @example
     * ```js
     * {
     *   policyDocuments: [
     *     {
     *       Version: "2012-10-17",
     *       Statement: [
     *         {
     *           Action: "iot:GetThingShadow",
     *           Effect: "Allow",
     *           Resource: "*",
     *         },
     *       ],
     *     },
     *   ],
     * };
     * ```
     */
    policyDocuments?: PolicyDocument[];
  }

  /**
   * Creates an authorization handler for the `Realtime` component. It validates
   * the token and grants permissions for the topics the client can subscribe and publish to.
   *
   * @example
   * ```js title="src/authorizer.ts" "realtime.authorizer"
   * export const handler = realtime.authorizer(async (token) => {
   *   // Validate the token
   *   console.log(token);
   *
   *   // Return the topics to subscribe and publish
   *   return {
   *     subscribe: ["*"],
   *     publish: ["*"],
   *   };
   * });
   * ```
   */
  export function authorizer(
    input: (token: string) => Promise<AuthResult>
  ): IoTCustomAuthorizerHandler {
    return async (evt, context) => {
      const [, , , region, accountId] = context.invokedFunctionArn.split(":");
      const token = Buffer.from(
        evt.protocolData.mqtt?.password ?? "",
        "base64"
      ).toString();
      const {
        principalId = evt.protocolData.mqtt?.username || Date.now().toString(),
        disconnectAfterInSeconds = 86400,
        refreshAfterInSeconds = 300,
        subscribe,
        publish,
        policyDocuments,
      } = await input(token);
      return {
        isAuthenticated: true,
        principalId,
        disconnectAfterInSeconds,
        refreshAfterInSeconds,
        policyDocuments: [
          {
            Version: "2012-10-17",
            Statement: [
              {
                Action: "iot:Connect",
                Effect: "Allow",
                Resource: "*",
              },
              ...(subscribe
                ? [
                    {
                      Action: "iot:Receive",
                      Effect: "Allow",
                      Resource: subscribe.map(
                        (t) => `arn:aws:iot:${region}:${accountId}:topic/${t}`
                      ),
                    },
                  ]
                : []),
              ...(subscribe
                ? [
                    {
                      Action: "iot:Subscribe",
                      Effect: "Allow",
                      Resource: subscribe.map(
                        (t) =>
                          `arn:aws:iot:${region}:${accountId}:topicfilter/${t}`
                      ),
                    },
                  ]
                : []),
              ...(publish
                ? [
                    {
                      Action: "iot:Publish",
                      Effect: "Allow",
                      Resource: publish.map(
                        (t) => `arn:aws:iot:${region}:${accountId}:topic/${t}`
                      ),
                    },
                  ]
                : []),
            ],
          },
          ...(policyDocuments ?? []),
        ],
      };
    };
  }
}
