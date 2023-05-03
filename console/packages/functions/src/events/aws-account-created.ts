import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";

export const handler = EventHandler(
  "aws.account.created",
  async (properties, actor) => {
    provideActor(actor);
    console.log("AWS Account Created", properties, actor);
  }
);
