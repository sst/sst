import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";
import { App } from "@console/core/app";
import { Stage } from "@console/core/app/stage";

export const handler = EventHandler(
  Stage.Events.StageConnected.type,
  async (properties, actor) => {
    provideActor(actor);
    Stage.syncMetadata(properties.stageID);
  }
);

export const handler = EventHandler(
  [Stage.Events.StageConnected],
  async (properties) => {}
);
