import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";
import { AWS } from "@console/core/aws";

export const handler = EventHandler(
  AWS.Account.Events.Created,
  async (properties, actor) => {
    provideActor(actor);
    console.log("AWS Account Created", properties, actor);
  }
);
