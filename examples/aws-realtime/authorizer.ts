import { RealtimeAuthHandler } from "sst";

export const handler = RealtimeAuthHandler(async () => {
  return {
    subscribe: [process.env.SST_TOPIC],
    publish: [process.env.SST_TOPIC],
  };
});
