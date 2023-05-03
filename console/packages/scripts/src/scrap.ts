import { provideActor } from "@console/core/actor";
import { AWS } from "@console/core/aws";

provideActor({
  type: "system",
  properties: {
    workspaceID: "a8hf2o91zf79zbnt6wodqxq0",
  },
});

await AWS.assumeRole({
  stageID: "wnbjaaq4hzaqxyz1h23cxtam",
});
