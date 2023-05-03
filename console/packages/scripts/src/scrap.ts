import { provideActor } from "@console/core/actor";
import { Bus } from "@console/core/bus";

provideActor({
  type: "system",
  properties: {
    workspaceID: "none",
  },
});
await Bus.publish("test.event", { foo: "bar" });
