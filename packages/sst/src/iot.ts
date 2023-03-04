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
import { randomUUID } from "crypto";

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
  /*
  console.log(endpoint, creds);
  const config =
    iotsdk.iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
      region: project.config.region!,
      credentials_provider: iotsdk.auth.AwsCredentialsProvider.newStatic(
        creds.accessKeyId,
        creds.secretAccessKey,
        creds.sessionToken
      ),
    })
      .with_client_id(randomUUID())
      .with_endpoint(endpoint)
      .build();
  console.log(config);

  const device2 = new iotsdk.mqtt.MqttClient();
  const conn = device2.new_connection(config);
  conn.on("connect", () => {
    console.log("CONNECTED");
  });
  conn.on("error", console.log);
  conn.on("connect", console.log);
  conn.on("resume", console.log);
  conn.on("message", console.log);
  conn.on("disconnect", console.log);
  conn.connect();
  console.log(device2);
  */

  const device = new iot.device({
    protocol: "wss",
    host: endpoint,
    region: project.config.region,
    accessKeyId: creds.accessKeyId,
    secretKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
    reconnectPeriod: 1,
  });
  const PREFIX = `/sst/${project.config.name}/${project.config.stage}`;
  device.subscribe(`${PREFIX}/events`, { qos: 1 });

  const fragments = new Map<string, Map<number, Fragment>>();

  device.on("connect", () => {
    Logger.debug("IoT connected");
  });

  device.on("error", (err) => {
    Logger.debug("IoT error", err);
  });

  device.on("close", () => {
    Logger.debug("IoT closed");
  });

  device.on("reconnect", () => {
    Logger.debug("IoT reconnected");
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
    async publish<Type extends EventTypes>(
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
        await new Promise<void>((r) => {
          device.publish(
            topic,
            JSON.stringify(fragment),
            {
              qos: 1,
            },
            () => {
              r();
            }
          );
        });
      }
      Logger.debug("IOT Published", topic, type);
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
