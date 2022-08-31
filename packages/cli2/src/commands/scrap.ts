import { useBus } from "../bus/index.js";
import { useIOT } from "../iot/index.js";

declare module "../bus/index.js" {
  export interface Events {
    "function.invocation": {
      functionID: string;
      env: Record<string, any>;
      event: any;
      context: any;
    };
    "function.responded": {
      type: "success";
      body: any;
    };
  }
}

export async function Scrap() {
  const iot = await useIOT();
  const bus = useBus();

  bus.subscribe("function.invocation", async (evt) => {
    const topic = `/sst/${evt.properties.env.SST_APP}/${evt.properties.env.SST_STAGE}/${evt.properties.functionID}/response`;
    iot.publish(topic, "function.responded", {
      type: "success",
      body: "Hello World",
    });
  });

  console.log("Listening for function invocations...");
}
