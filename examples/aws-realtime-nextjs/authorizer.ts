import { Resource } from "sst";
import { realtime } from "sst/aws/realtime";

export const handler = realtime.authorizer(async (token) => {
  const prefix = `${Resource.App.name}/${Resource.App.stage}`;

  // Validate token

  return {
    publish: [`${prefix}/*`],
    subscribe: [`${prefix}/*`],
  };
});
