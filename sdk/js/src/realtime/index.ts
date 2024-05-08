import type { IoTCustomAuthorizerHandler } from "aws-lambda";

export interface RealtimeAuthResult {
  /**
   * The topics the client can subscribe to.
   * @example
   * For example, this subscribes to specific topics.
   * ```js
   * {
   *   subscribe: ["chat/room1", "chat/room2"]
   * }
   * ```
   *
   * And to subscribe to all topics under a specific prefix.
   * ```js
   * {
   *   subscribe: ["chat/#"]
   * }
   * ```
   */
  subscribe?: string[];
  /**
   * The topics the client can publish to.
   * @example
   * For example, this publishes to specific topics.
   * ```js
   * {
   *   publish: ["chat/room1", "chat/room2"]
   * }
   * ```
   * And to publish to all topics under a specific prefix.
   * ```js
   * {
   *   publish: ["chat/#"]
   * }
   * ```
   */
  publish?: string[];
}

/**
 * Creates an authorization handler for the `Realtime` component, that validates
 * the token and grants permissions for the topics the client can subscribe and publish to.
 *
 * @example
 * ```js
 * import { RealtimeAuthHandler, Resource } from "sst";
 *
 * export const handler = RealtimeAuthHandler(async (token) => {
 *   // Validate the token
 *   console.log(token);
 *
 *   // Return the topics to subscribe and publish
 *   return {
 *     subscribe: [`${Resource.App.name}/${Resource.App.stage}/chat/room1`],
 *     publish: [`${Resource.App.name}/${Resource.App.stage}/chat/room1`],
 *   };
 * });
 * ```
 */
export function RealtimeAuthHandler(
  input: (token: string) => Promise<RealtimeAuthResult>
): IoTCustomAuthorizerHandler {
  return async (evt, context) => {
    const [, , , region, accountId] = context.invokedFunctionArn.split(":");
    const token = Buffer.from(
      evt.protocolData.mqtt?.password ?? "",
      "base64"
    ).toString();
    const ret = await input(token);
    return {
      isAuthenticated: true,
      principalId: Date.now().toString(),
      disconnectAfterInSeconds: 86400,
      refreshAfterInSeconds: 300,
      policyDocuments: [
        {
          Version: "2012-10-17",
          Statement: [
            {
              Action: "iot:Connect",
              Effect: "Allow",
              Resource: "*",
            },
            ...(ret.subscribe
              ? [
                  {
                    Action: "iot:Receive",
                    Effect: "Allow",
                    Resource: ret.subscribe.map(
                      (t) => `arn:aws:iot:${region}:${accountId}:topic/${t}`
                    ),
                  },
                ]
              : []),
            ...(ret.subscribe
              ? [
                  {
                    Action: "iot:Subscribe",
                    Effect: "Allow",
                    Resource: ret.subscribe.map(
                      (t) =>
                        `arn:aws:iot:${region}:${accountId}:topicfilter/${t}`
                    ),
                  },
                ]
              : []),
            ...(ret.publish
              ? [
                  {
                    Action: "iot:Publish",
                    Effect: "Allow",
                    Resource: ret.publish.map(
                      (t) => `arn:aws:iot:${region}:${accountId}:topic/${t}`
                    ),
                  },
                ]
              : []),
          ],
        },
      ],
    };
  };
}
