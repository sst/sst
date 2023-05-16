import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";
import { Stage } from "@console/core/app/stage";

export const handler = EventHandler(
  Stage.Events.Connected,
  async (properties, actor) => {
    provideActor(actor);
    Stage.syncMetadata(properties.stageID);
  }
);
