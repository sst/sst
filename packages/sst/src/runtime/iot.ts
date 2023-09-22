import { Context } from "../context/context.js";
import { useBus } from "../bus.js";
import { useIOT } from "../iot.js";
import { lazy } from "../util/lazy.js";

export const useIOTBridge = lazy(async () => {
  const bus = useBus();
  const iot = await useIOT();
  const topic = `${iot.prefix}/events`;

  bus.subscribe("function.success", async (evt) => {
    iot.publish(
      topic + "/" + evt.properties.workerID,
      "function.success",
      evt.properties
    );
  });
  bus.subscribe("function.error", async (evt) => {
    iot.publish(
      topic + "/" + evt.properties.workerID,
      "function.error",
      evt.properties
    );
  });
  bus.subscribe("function.ack", async (evt) => {
    iot.publish(
      topic + "/" + evt.properties.workerID,
      "function.ack",
      evt.properties
    );
  });
});
