import { provideActor } from "@console/core/actor";
import { EventHandler } from "./handler";
import { App } from "@console/core/app";

export const handler = EventHandler(
  "app.stage.connected",
  async (properties, actor) => {
    provideActor(actor);
    App.Stage.syncMetadata(properties.stageID);
  }
);
