import { realtime } from "../aws/realtime.js";

export type RealtimeAuthResult = realtime.AuthResult;

/**
 * @deprecated import from `sst/aws/realtime` instead.
 *
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
export const RealtimeAuthHandler = realtime.authorizer;
