import { useBus } from "../bus/index.js";
import { useIOT } from "../iot/index.js";

declare module "../bus/index.js" {
  export interface Events {}
}

export async function Scrap() {
  const iot = await useIOT();
  const bus = useBus();

  bus.subscribe("function.success", async (evt) => {
    const topic = `${iot.prefix}/response`;
    iot.publish(topic, "function.success", {
      functionID: evt.properties.functionID,
      body: "Hello World",
    });
  });

  console.log("Listening for function invocations...");
}
