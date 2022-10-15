import { Context } from "@serverless-stack/node/context/context.js";
import { useBus } from "../bus";
import { useIOT } from "../iot";

export const useIOTBridge = Context.memo(async () => {
  const bus = useBus();
  const iot = await useIOT();

  bus.subscribe("function.success", async (evt) => {
    const topic = `${iot.prefix}/events`;
    iot.publish(topic, "function.success", evt.properties);
  });
});
