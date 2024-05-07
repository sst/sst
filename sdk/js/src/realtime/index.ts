/**
 * Creates an authorization handler for the `Realtime` component, that validates
 * the token and grants permissions for the topics the client can subscribe and publish to.
 *
 * @example
 * ```js
 * import { RealtimeAuthHandler } from "sst";
 *
 * export const handler = RealtimeAuthHandler(async (token) => {
 *   // Validate the token
 *   console.log(token);
 *
 *   // Return the topics to subscribe and publish
 *   return {
 *     subscribe: ["chat/room1"],
 *     publish: ["chat/room1"],
 *   };
 * });
 *
 * ```
 */
export function RealtimeAuthHandler(
  input: (token: string) => Promise<{ subscribe: string[]; publish: string[] }>
) {
  return async (evt: any, context: any) => {
    const [, , , region, accountId] = context.invokedFunctionArn.split(":");
    const token = Buffer.from(
      evt.protocolData.mqtt.password,
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
                    Resource: ret.subscribe.map(
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
