import { Context } from "@serverless-stack/node/context/context.js";
import { useBus } from "../bus.js";
import { useIOT } from "../iot.js";

export const useIOTBridge = Context.memo(async () => {
  const bus = useBus();
  const iot = await useIOT();
  const topic = `${iot.prefix}/events`;

  bus.subscribe("function.success", async (evt) => {
    iot.publish(topic, "function.success", evt.properties);
  });
  bus.subscribe("function.error", async (evt) => {
    iot.publish(topic, "function.error", evt.properties);
  });
});
