import { EventHandler } from "./handler";

export const handler = EventHandler("test.event", async (properties, actor) => {
  console.log("event", properties, actor);
});
