import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { Context } from "./context/context.js";
import { useAWSClient, useAWSCredentials } from "./credentials.js";
import { VisibleError } from "./error.js";

export const useIOTEndpoint = Context.memo(async () => {
  const iot = useAWSClient(IoTClient);
  Logger.debug("Getting IoT endpoint");
  const response = await iot.send(
    new DescribeEndpointCommand({
      endpointType: "iot:Data-ATS",
    })
  );
  Logger.debug("Using IoT endpoint:", response.endpointAddress);

  if (!response.endpointAddress)
    throw new VisibleError("IoT Endpoint address not found");

  return response.endpointAddress;
});

import iot from "aws-iot-device-sdk";
import { EventPayload, Events, EventTypes, useBus } from "./bus.js";
import { useProject } from "./project.js";
import { Logger } from "./logger.js";

interface Fragment {
  id: string;
  index: number;
  count: number;
  data: string;
}

export const useIOT = Context.memo(async () => {
  const bus = useBus();

  const endpoint = await useIOTEndpoint();
  const creds = await useAWSCredentials();
  const project = useProject();
  const device = new iot.device({
    protocol: "wss",
    host: endpoint,
    accessKeyId: creds.accessKeyId,
    secretKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
  });
  const PREFIX = `/sst/${project.config.name}/${project.config.stage}`;
  device.subscribe(`${PREFIX}/events`);

  const fragments = new Map<string, Map<number, Fragment>>();

  device.on("error", (err) => {
    Logger.debug("IoT error", err);
  });
  device.on("message", (_topic, buffer: Buffer) => {
    const fragment = JSON.parse(buffer.toString());
    if (!fragment.id) {
      bus.publish(fragment.type, fragment.properties);
      return;
    }

    let pending = fragments.get(fragment.id);
    if (!pending) {
      pending = new Map();
      fragments.set(fragment.id, pending);
    }
    pending.set(fragment.index, fragment);

    if (pending.size === fragment.count) {
      const data = [...pending.values()]
        .sort((a, b) => a.index - b.index)
        .map((item) => item.data)
        .join("");
      fragments.delete(fragment.id);
      const evt = JSON.parse(data) as EventPayload;
      if (evt.sourceID === bus.sourceID) return;
      bus.publish(evt.type, evt.properties);
    }
  });

  return {
    prefix: PREFIX,
    publish<Type extends EventTypes>(
      topic: string,
      type: Type,
      properties: Events[Type]
    ) {
      const payload: EventPayload = {
        type,
        properties,
        sourceID: bus.sourceID,
      };
      for (const fragment of encode(payload)) {
        device.publish(topic, JSON.stringify(fragment), {
          qos: 1,
        });
      }
    },
  };
});

function encode(input: any) {
  const json = JSON.stringify(input);
  const parts = json.match(/.{1,100000}/g);
  if (!parts) return [];
  const id = Math.random().toString();
  return parts.map((part, index) => ({
    id,
    index,
    count: parts?.length,
    data: part,
  }));
}
