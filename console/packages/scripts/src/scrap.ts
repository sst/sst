import { provideActor } from "@console/core/actor";
import { App } from "@console/core/app";
import { User } from "@console/core/user";

provideActor({
  type: "system",
  properties: {
    workspaceID: "a8hf2o91zf79zbnt6wodqxq0",
  },
});

const result = await App.Stage.syncMetadata("vdapvhs9olt0fdzsfja99x5t");
